import type { NextRequest } from "next/server";

/**
 * Client IP for rate limits. Prefer platform-set headers the client cannot forge
 * when behind Cursor/Cloudflare/Vercel. Never key solely on raw X-Forwarded-For.
 */
export function clientIp(req: Request | NextRequest): string {
  const h = (name: string) => {
    if ("headers" in req && typeof (req as NextRequest).headers?.get === "function") {
      return (req as NextRequest).headers.get(name);
    }
    return null;
  };

  const cf = h("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 128);

  const real = h("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);

  const vercel = h("x-vercel-forwarded-for")?.trim();
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }

  // Only trust XFF when we know a reverse proxy strips/forges it (platform deployments).
  const trustXff =
    process.env.TRUST_X_FORWARDED_FOR === "true" ||
    process.env.VERCEL === "1" ||
    Boolean(process.env.CURSOR_APP_URL) ||
    Boolean(h("x-vercel-id"));

  if (trustXff) {
    const xff = h("x-forwarded-for")?.trim();
    if (xff) {
      // Right-most or left-most: platforms usually prepend client. Take first hop.
      const first = xff.split(",")[0]?.trim();
      if (first) return first.slice(0, 128);
    }
  }

  return "unknown";
}
