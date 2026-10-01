// Free-tier friendly pacing: at most one model call per interval from this module instance.
// Promptfoo's own "delay" option is not applied to custom providers, so we do it here.
let last = 0;

export async function throttle() {
  if (process.env.EVAL_MODE === 'mock') return;
  const interval = Number(process.env.EVAL_MIN_INTERVAL_MS ?? 10_000);
  const wait = last + interval - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
}
