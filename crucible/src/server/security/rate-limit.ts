import { ensureRedis, isRedisConfigured } from "@/lib/redis";
import { AppError } from "@/lib/errors";

type Bucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();

function memoryLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const cur = memoryBuckets.get(key);
  if (!cur || cur.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  cur.count += 1;
  if (cur.count > max) throw new AppError("Rate limit exceeded", 429, "RATE_LIMITED");
}

/** Fail closed: Redis when configured, otherwise in-memory per-process limits. */
export async function rateLimit(
  key: string,
  max = Number(process.env.RATE_LIMIT_MAX ?? 120),
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
) {
  if (!isRedisConfigured()) {
    memoryLimit(key, max, windowMs);
    return;
  }
  try {
    const redis = await ensureRedis();
    if (!redis) {
      memoryLimit(key, max, windowMs);
      return;
    }
    const bucket = `rl:${key}`;
    const count = await redis.incr(bucket);
    if (count === 1) await redis.pexpire(bucket, windowMs);
    if (count > max) throw new AppError("Rate limit exceeded", 429, "RATE_LIMITED");
  } catch (err) {
    if (err instanceof AppError) throw err;
    memoryLimit(key, max, windowMs);
  }
}
