'use client';

/**
 * Cached result of GET /api/ably/config — avoids spamming /api/ably/auth when ABLY_KEY is unset.
 */
let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

export function getAblyEnabled(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch('/api/ably/config')
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d: { enabled?: boolean }) => {
        cached = !!d?.enabled;
        return cached;
      })
      .catch(() => {
        cached = false;
        return false;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
