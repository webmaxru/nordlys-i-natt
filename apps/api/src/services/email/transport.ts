import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../../config';

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; retryAfterMs?: number; error: string };

export interface EmailTransport {
  readonly name: string;
  send(msg: OutgoingEmail): Promise<SendResult>;
}

/** Azure Communication Services Email. */
export class AcsTransport implements EmailTransport {
  readonly name = 'acs';
  private client: import('@azure/communication-email').EmailClient | null = null;

  constructor(
    private readonly connectionString: string,
    private readonly sender: string,
    private readonly replyTo = '',
  ) {}

  private async getClient() {
    if (!this.client) {
      const { EmailClient } = await import('@azure/communication-email');
      this.client = new EmailClient(this.connectionString);
    }
    return this.client;
  }

  async send(msg: OutgoingEmail): Promise<SendResult> {
    try {
      const client = await this.getClient();
      const poller = await client.beginSend({
        senderAddress: this.sender,
        recipients: { to: [{ address: msg.to }] },
        content: { subject: msg.subject, html: msg.html, plainText: msg.text },
        headers: msg.headers,
        ...(this.replyTo ? { replyTo: [{ address: this.replyTo }] } : {}),
      });
      // The send is accepted once beginSend returns; we don't wait for final delivery.
      // (Open/click tracking is switched off on the ACS domain itself, see infra/modules/email.bicep.)
      const state = poller.getOperationState();
      return { ok: true, id: String((state as { id?: string }).id ?? randomUUID()) };
    } catch (err) {
      const e = err as {
        statusCode?: number;
        message?: string;
        response?: { headers?: { get?(n: string): string | undefined } };
      };
      const retryAfter = Number(e.response?.headers?.get?.('retry-after'));
      return {
        ok: false,
        error: `${e.statusCode ?? ''} ${e.message ?? String(err)}`.trim(),
        ...(e.statusCode === 429
          ? { retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : 60_000 }
          : {}),
      };
    }
  }
}

/** Writes each e-mail as a JSON file (local development and end-to-end tests). */
export class OutboxTransport implements EmailTransport {
  readonly name = 'outbox';
  readonly sent: OutgoingEmail[] = [];
  constructor(private readonly dir: string) {}
  async send(msg: OutgoingEmail): Promise<SendResult> {
    const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    this.sent.push(msg);
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, `${id}.json`), JSON.stringify({ id, ...msg }, null, 2), 'utf8');
    return { ok: true, id };
  }
}

let override: EmailTransport | null | undefined;

/** The configured transport, or null when e-mail alerts are switched off. */
export function emailTransport(): EmailTransport | null {
  if (override !== undefined) return override;
  const c = config.email;
  if (!c.enabled) return null;
  if (c.transport === 'outbox') return new OutboxTransport(c.outboxDir);
  if (!c.acsConnectionString || !c.sender) return null;
  return new AcsTransport(c.acsConnectionString, c.sender, c.replyTo);
}

/** Test hook. `undefined` restores the configured transport. */
export function setEmailTransport(t: EmailTransport | null | undefined): void {
  override = t;
}

export function emailEnabled(): boolean {
  return emailTransport() !== null;
}
