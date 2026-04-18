import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '15 m'),
      analytics: true,
    })
  : null;

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const memoryHits = new Map<string, number[]>();

function rateLimitLoginMemory(ip: string): { allowed: boolean } {
  const now = Date.now();
  const prev = (memoryHits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (prev.length >= MAX_ATTEMPTS) {
    memoryHits.set(ip, prev);
    return { allowed: false };
  }
  prev.push(now);
  memoryHits.set(ip, prev);
  return { allowed: true };
}

export async function rateLimitLogin(ip: string): Promise<{ allowed: boolean; reset?: number; remaining?: number }> {
  if (loginLimiter) {
    const { success, reset, remaining } = await loginLimiter.limit(`login_${ip}`);
    return { allowed: success, reset, remaining };
  }
  return rateLimitLoginMemory(ip);
}

