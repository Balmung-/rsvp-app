import { prisma } from "./db";

export interface RateLimitConfig {
  key: string;
  capacity: number;
  refillPerSecond: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Token-bucket rate limit backed by Postgres. Shared across web + worker
 * processes without any additional infra. Call at ingress (API routes).
 */
export async function rateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { key: config.key } });
    let tokens = bucket?.tokens ?? config.capacity;
    const last = bucket?.updatedAt ?? now;
    const elapsedMs = Math.max(0, now.getTime() - last.getTime());
    tokens = Math.min(config.capacity, tokens + (elapsedMs / 1000) * config.refillPerSecond);

    if (tokens < 1) {
      const missing = 1 - tokens;
      const retryAfterMs = Math.ceil((missing / config.refillPerSecond) * 1000);
      await tx.rateLimitBucket.upsert({
        where: { key: config.key },
        create: { key: config.key, tokens, updatedAt: now },
        update: { tokens, updatedAt: now },
      });
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    const next = tokens - 1;
    await tx.rateLimitBucket.upsert({
      where: { key: config.key },
      create: { key: config.key, tokens: next, updatedAt: now },
      update: { tokens: next, updatedAt: now },
    });
    return { allowed: true, remaining: Math.floor(next), retryAfterMs: 0 };
  });
}

export function ipFromRequest(req: Request): string {
  const h = req.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "0.0.0.0";
}
