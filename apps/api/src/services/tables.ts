import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { TableClient } from '@azure/data-tables';
import { config } from '../config';

/**
 * A tiny keyed collection used for the e-mail subscribers and app devices.
 * Two drivers, chosen by STORE_DRIVER like the web-push store:
 *  - "file": one JSON file per collection (local dev, tests)
 *  - "table": one Azure Table per collection, all rows in one partition
 * Rows are flat JSON objects with a string `id`. Nested values are stored as JSON strings in
 * Table Storage, so the shape is the same on both drivers.
 */
export interface Collection<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  upsert(row: T): Promise<void>;
  remove(id: string): Promise<void>;
}

export class FileCollection<T extends { id: string }> implements Collection<T> {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly filePath: string) {}

  async list(): Promise<T[]> {
    return this.readAll();
  }
  async get(id: string): Promise<T | null> {
    return (await this.readAll()).find((r) => r.id === id) ?? null;
  }
  upsert(row: T): Promise<void> {
    return this.mutate((all) => {
      const i = all.findIndex((r) => r.id === row.id);
      if (i === -1) all.push(row);
      else all[i] = row;
      return all;
    });
  }
  remove(id: string): Promise<void> {
    return this.mutate((all) => all.filter((r) => r.id !== id));
  }

  private mutate(fn: (all: T[]) => T[]): Promise<void> {
    const next = this.queue.then(async () => {
      const all = fn(await this.readAll());
      await mkdir(dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(tmp, `${JSON.stringify(all, null, 2)}\n`, 'utf8');
      await rename(tmp, this.filePath);
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async readAll(): Promise<T[]> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }
}

const PARTITION = 'row';

export class TableCollection<T extends { id: string }> implements Collection<T> {
  private readonly client: TableClient;
  private ready: Promise<void> | null = null;

  constructor(tableName: string, connectionString = config.store.tableConnectionString) {
    this.client = TableClient.fromConnectionString(connectionString, tableName);
  }

  async list(): Promise<T[]> {
    await this.ensure();
    const out: T[] = [];
    for await (const e of this.client.listEntities<Record<string, unknown>>({
      queryOptions: { filter: `PartitionKey eq '${PARTITION}'` },
    })) {
      out.push(fromEntity<T>(e));
    }
    return out;
  }
  async get(id: string): Promise<T | null> {
    await this.ensure();
    try {
      return fromEntity<T>(await this.client.getEntity<Record<string, unknown>>(PARTITION, id));
    } catch (err) {
      if (statusOf(err) === 404) return null;
      throw err;
    }
  }
  async upsert(row: T): Promise<void> {
    await this.ensure();
    await this.client.upsertEntity(toEntity(row), 'Replace');
  }
  async remove(id: string): Promise<void> {
    await this.ensure();
    try {
      await this.client.deleteEntity(PARTITION, id);
    } catch (err) {
      if (statusOf(err) !== 404) throw err;
    }
  }
  private ensure(): Promise<void> {
    this.ready ??= this.client.createTable().catch((err) => {
      if (statusOf(err) !== 409) throw err;
    });
    return this.ready;
  }
}

function toEntity<T extends { id: string }>(row: T) {
  const entity: Record<string, unknown> = { partitionKey: PARTITION, rowKey: row.id };
  for (const [k, v] of Object.entries(row)) {
    if (k === 'id' || v === undefined) continue;
    entity[k] = v !== null && typeof v === 'object' ? `json:${JSON.stringify(v)}` : v;
  }
  return entity as { partitionKey: string; rowKey: string } & Record<string, unknown>;
}

function fromEntity<T>(e: Record<string, unknown>): T {
  const row: Record<string, unknown> = { id: e.rowKey };
  for (const [k, v] of Object.entries(e)) {
    if (
      k === 'partitionKey' ||
      k === 'rowKey' ||
      k === 'etag' ||
      k === 'timestamp' ||
      k.startsWith('odata')
    )
      continue;
    row[k] = typeof v === 'string' && v.startsWith('json:') ? JSON.parse(v.slice(5)) : v;
  }
  return row as T;
}

function statusOf(err: unknown): number | undefined {
  return err && typeof err === 'object' && 'statusCode' in err
    ? (err as { statusCode?: number }).statusCode
    : undefined;
}

const cache = new Map<string, Collection<{ id: string }>>();

/** Shared collection instance by name ("emailsubs", "devices"). */
export function collection<T extends { id: string }>(name: string): Collection<T> {
  let c = cache.get(name);
  if (!c) {
    c =
      config.store.driver === 'table'
        ? new TableCollection<{ id: string }>(name)
        : new FileCollection<{ id: string }>(join(config.store.fileDir, `${name}.json`));
    cache.set(name, c);
  }
  return c as unknown as Collection<T>;
}

/** Test hook: forget cached instances (after changing config.store). */
export function resetCollections(): void {
  cache.clear();
}
