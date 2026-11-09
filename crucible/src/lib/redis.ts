import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

function redisUrl() {
  return process.env.REDIS_URL?.trim() || "";
}

/** Localhost Redis is unavailable on Vercel serverless — skip it. */
export function isRedisConfigured() {
  const url = redisUrl();
  if (!url) return false;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function getRedis() {
  if (!isRedisConfigured()) return null;
  if (globalForRedis.redis === undefined) {
    globalForRedis.redis = new Redis(redisUrl(), {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 1500,
      enableOfflineQueue: false,
    });
  }
  return globalForRedis.redis;
}

export async function ensureRedis() {
  const client = getRedis();
  if (!client) return null;
  if (client.status === "wait" || client.status === "end") {
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connect timeout")), 2000)),
    ]);
  }
  return client;
}
