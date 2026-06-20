import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { TableClient } from '@azure/data-tables';
import { config } from '../config';

export type Sub = {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  lat: number;
  lon: number;
  name: string;
  lang: 'nb' | 'en';
  createdAt: string;
  lastNotifiedAt?: string;
  lastVerdict?: string;
};

export interface SubscriptionStore {
  list(): Promise<Sub[]>;
  upsert(sub: Sub): Promise<void>;
  remove(id: string): Promise<void>;
  get(id: string): Promise<Sub | null>;
}

export function subscriptionId(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('base64url');
}

export class FileStore implements SubscriptionStore {
  constructor(private readonly filePath = config.store.filePath) {}

  async list(): Promise<Sub[]> {
    return this.readAll();
  }

  async upsert(sub: Sub): Promise<void> {
    const all = await this.readAll();
    const index = all.findIndex((item) => item.id === sub.id);
    if (index === -1) {
      all.push(sub);
    } else {
      all[index] = sub;
    }

    await this.writeAll(all);
  }

  async remove(id: string): Promise<void> {
    const all = await this.readAll();
    await this.writeAll(all.filter((sub) => sub.id !== id));
  }

  async get(id: string): Promise<Sub | null> {
    const all = await this.readAll();
    return all.find((sub) => sub.id === id) ?? null;
  }

  private async readAll(): Promise<Sub[]> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isSub) : [];
    } catch (err) {
      if (isNodeError(err) && err.code === 'ENOENT') {
        return [];
      }

      throw err;
    }
  }

  private async writeAll(subs: Sub[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(subs, null, 2)}\n`, 'utf8');
  }
}

type TableSubEntity = {
  partitionKey: string;
  rowKey: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  lat: number;
  lon: number;
  name: string;
  lang: 'nb' | 'en';
  createdAt: string;
  lastNotifiedAt?: string;
  lastVerdict?: string;
};

const partitionKey = 'subscription';

export class TableStore implements SubscriptionStore {
  private readonly client = TableClient.fromConnectionString(
    config.store.tableConnectionString,
    config.store.tableName,
  );

  private ensureTablePromise: Promise<void> | null = null;

  async list(): Promise<Sub[]> {
    await this.ensureTable();
    const subs: Sub[] = [];
    const filter = `PartitionKey eq '${partitionKey}'`;
    for await (const entity of this.client.listEntities<TableSubEntity>({
      queryOptions: { filter },
    })) {
      subs.push(fromTableEntity(entity));
    }

    return subs;
  }

  async upsert(sub: Sub): Promise<void> {
    await this.ensureTable();
    await this.client.upsertEntity(toTableEntity(sub), 'Replace');
  }

  async remove(id: string): Promise<void> {
    await this.ensureTable();
    try {
      await this.client.deleteEntity(partitionKey, id);
    } catch (err) {
      if (!isStatusError(err, 404)) {
        throw err;
      }
    }
  }

  async get(id: string): Promise<Sub | null> {
    await this.ensureTable();
    try {
      return fromTableEntity(
        await this.client.getEntity<TableSubEntity>(partitionKey, id),
      );
    } catch (err) {
      if (isStatusError(err, 404)) {
        return null;
      }

      throw err;
    }
  }

  private async ensureTable(): Promise<void> {
    this.ensureTablePromise ??= this.client.createTable().catch((err) => {
      if (!isStatusError(err, 409)) {
        throw err;
      }
    });
    await this.ensureTablePromise;
  }
}

export function createStore(): SubscriptionStore {
  return config.store.driver === 'file' ? new FileStore() : new TableStore();
}

function toTableEntity(sub: Sub): TableSubEntity {
  return {
    partitionKey,
    rowKey: sub.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    lat: sub.lat,
    lon: sub.lon,
    name: sub.name,
    lang: sub.lang,
    createdAt: sub.createdAt,
    lastNotifiedAt: sub.lastNotifiedAt,
    lastVerdict: sub.lastVerdict,
  };
}

function fromTableEntity(entity: TableSubEntity): Sub {
  return {
    id: entity.rowKey,
    endpoint: entity.endpoint,
    keys: {
      p256dh: entity.p256dh,
      auth: entity.auth,
    },
    lat: entity.lat,
    lon: entity.lon,
    name: entity.name,
    lang: entity.lang,
    createdAt: entity.createdAt,
    lastNotifiedAt: entity.lastNotifiedAt,
    lastVerdict: entity.lastVerdict,
  };
}

function isSub(value: unknown): value is Sub {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Sub>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.endpoint === 'string' &&
    typeof candidate.keys?.p256dh === 'string' &&
    typeof candidate.keys.auth === 'string' &&
    typeof candidate.lat === 'number' &&
    typeof candidate.lon === 'number' &&
    typeof candidate.name === 'string' &&
    (candidate.lang === 'nb' || candidate.lang === 'en') &&
    typeof candidate.createdAt === 'string'
  );
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

function isStatusError(err: unknown, statusCode: number): boolean {
  return (
    err instanceof Error &&
    'statusCode' in err &&
    (err as { statusCode?: number }).statusCode === statusCode
  );
}
