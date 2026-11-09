import { AppError } from "@/lib/errors";

/** Reject cross-site state-changing requests (defense in depth with SameSite cookies). */
export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;

  const origin = req.headers.get("origin");
  const app =
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.CURSOR_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "";

  // Same-origin fetch from browsers always sends Origin on POST. Non-browser clients may omit it.
  if (!origin) {
    if (process.env.REQUIRE_ORIGIN_HEADER === "true") {
      throw new AppError("Missing Origin", 403, "CSRF_ORIGIN");
    }
    return;
  }

  const allowed = new Set<string>();
  if (app) allowed.add(app);
  for (const extra of (process.env.ALLOWED_ORIGINS || "").split(",")) {
    const t = extra.trim().replace(/\/$/, "");
    if (t) allowed.add(t);
  }
  // Local + tunnel demos
  allowed.add("http://127.0.0.1:3847");
  allowed.add("http://localhost:3847");

  try {
    const o = new URL(origin);
    const originNorm = `${o.protocol}//${o.host}`;
    if (allowed.has(originNorm)) return;
    if (o.hostname.endsWith(".trycloudflare.com") && o.protocol === "https:") return;
    if (process.env.CURSOR_APP_HOST && o.host === process.env.CURSOR_APP_HOST) return;
  } catch {
    throw new AppError("Invalid Origin", 403, "CSRF_ORIGIN");
  }

  throw new AppError("Cross-origin request blocked", 403, "CSRF_ORIGIN");
}
