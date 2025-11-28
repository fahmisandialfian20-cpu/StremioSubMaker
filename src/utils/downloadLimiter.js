const log = require('./logger');

const DEFAULT_DOWNLOADS_PER_MINUTE = 12;
const WINDOW_MS = 60 * 1000;

const maxDownloadsPerMinute = (() => {
  const raw = process.env.DOWNLOADS_PER_MINUTE;
  if (raw !== undefined) {
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    log.warn(() => `[DownloadLimiter] Invalid DOWNLOADS_PER_MINUTE="${raw}", falling back to default ${DEFAULT_DOWNLOADS_PER_MINUTE}/min`);
  }
  return DEFAULT_DOWNLOADS_PER_MINUTE;
})();

// Sliding-window limiter shared across all download providers
let timestamps = [];
let chain = Promise.resolve();

async function waitForDownloadSlot(context = 'Download') {
  let waitedMs = 0;

  chain = chain.then(async () => {
    while (true) {
      const now = Date.now();
      timestamps = timestamps.filter(t => now - t < WINDOW_MS);

      if (timestamps.length < maxDownloadsPerMinute) {
        timestamps.push(now);
        return waitedMs;
      }

      const waitMs = Math.max(50, WINDOW_MS - (now - timestamps[0]));
      waitedMs += waitMs;
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }).catch(err => {
    // Reset chain on error to avoid deadlocks
    log.error(() => [`[DownloadLimiter] Error while throttling (${context}):`, err?.message || String(err)]);
    chain = Promise.resolve();
    return waitedMs;
  });

  return chain;
}

function currentDownloadLimit() {
  return {
    maxPerMinute: maxDownloadsPerMinute,
    windowMs: WINDOW_MS
  };
}

module.exports = {
  waitForDownloadSlot,
  currentDownloadLimit
};
