type SlidingWindowRule = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

const globalForRateLimit = globalThis as typeof globalThis & {
  __appointmentRateLimitStore?: Map<string, number[]>;
};

const rateLimitStore =
  globalForRateLimit.__appointmentRateLimitStore ?? new Map<string, number[]>();

if (!globalForRateLimit.__appointmentRateLimitStore) {
  globalForRateLimit.__appointmentRateLimitStore = rateLimitStore;
}

const DEFAULT_RULES: SlidingWindowRule[] = [
  { windowMs: 60_000, maxRequests: 6 },
  { windowMs: 3_600_000, maxRequests: 30 },
];

export function checkRateLimit(
  key: string,
  rules: SlidingWindowRule[] = DEFAULT_RULES
): RateLimitResult {
  const now = Date.now();
  const maxWindowMs = Math.max(...rules.map((rule) => rule.windowMs));
  const existingHits = rateLimitStore.get(key) ?? [];
  const recentHits = existingHits.filter((ts) => now - ts < maxWindowMs);

  for (const rule of rules) {
    const hitsInWindow = recentHits.filter((ts) => now - ts < rule.windowMs);
    if (hitsInWindow.length >= rule.maxRequests) {
      const oldestHitInWindow = hitsInWindow[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rule.windowMs - (now - oldestHitInWindow)) / 1000)
      );
      rateLimitStore.set(key, recentHits);
      return { allowed: false, retryAfterSeconds };
    }
  }

  recentHits.push(now);
  rateLimitStore.set(key, recentHits);
  return { allowed: true };
}
