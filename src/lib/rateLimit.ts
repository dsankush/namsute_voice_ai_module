// In-memory sliding-window rate limiter for API routes.
// NOTE: state is per server instance — on multi-instance serverless deployments
// (e.g. Vercel with multiple concurrent lambdas) each instance tracks its own
// counts, so the effective global limit is looser than the configured value.
// That's an acceptable tradeoff for a demo endpoint; a shared store (e.g. Redis)
// would be needed for a hard global cap.

const hits = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 5000;

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = hits.get(key) || [];
  const recent = existing.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  hits.set(key, recent);

  // Bound map growth — evict oldest-looking entry if we're tracking too many keys
  if (hits.size > MAX_TRACKED_KEYS) {
    const firstKey = hits.keys().next().value;
    if (firstKey) hits.delete(firstKey);
  }

  return { allowed: true, remaining: limit - recent.length };
}

export function getClientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
