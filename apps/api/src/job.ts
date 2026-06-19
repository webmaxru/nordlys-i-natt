/**
 * Entry point for the Azure Container Apps cron Job.
 *
 * Evaluates aurora conditions for every push subscription and sends
 * notifications when a location crosses into "GO". The real implementation is
 * added in the notifications phase (imports the scheduler/evaluate module);
 * this stub keeps the image runnable until then.
 */
async function main() {
  // eslint-disable-next-line no-console
  console.log('[job] evaluate run at', new Date().toISOString());
  // notifications phase: await evaluateAndNotify();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[job] failed', err);
  process.exit(1);
});
