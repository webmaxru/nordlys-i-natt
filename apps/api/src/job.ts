import { evaluateAndNotify } from './scheduler/evaluate';

async function main() {
  const result = await evaluateAndNotify();
  console.log('[job] evaluate result', result);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[job] failed', err);
  process.exit(1);
});
