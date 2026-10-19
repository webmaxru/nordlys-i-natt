import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Runs before any module reads config: every test gets a throwaway file store and no real
// e-mail or push credentials.
const dir = mkdtempSync(join(tmpdir(), 'nordlys-api-test-'));
process.env.STORE_DRIVER = 'file';
process.env.STORE_FILE_DIR = dir;
process.env.STORE_FILE_PATH = join(dir, 'subscriptions.json');
process.env.EMAIL_ENABLED = 'true';
process.env.EMAIL_TRANSPORT = 'outbox';
process.env.EMAIL_OUTBOX_DIR = join(dir, 'outbox');
process.env.EMAIL_SEND_INTERVAL_MS = '0';
process.env.PUBLIC_BASE_URL = 'https://nordlys.test';
process.env.VAPID_PUBLIC_KEY = '';
process.env.VAPID_PRIVATE_KEY = '';
process.env.LOG_LEVEL = 'silent';
process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = '';
