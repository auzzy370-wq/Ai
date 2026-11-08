import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { withHandler } from "@/server/auth/api";
import { completeEmailVerification } from "@/server/auth/email-verification";
import { clientIp } from "@/server/security/client-ip";
import { rateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

function redirectTo(path: string, req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const origin = process.env.APP_URL?.replace(/\/$/, "") || (host ? `${proto}://${host}` : "http://127.0.0.1:3847");
  return NextResponse.redirect(new URL(path, origin));
}

/** GET — open from the verification email; creates the user and session. */
export async function GET(req: Request) {
  return withHandler(async () => {
    const ip = clientIp(req);
    await rateLimit(`verify-email:${ip}`, 30);
    await rateLimit(`verify-email-global`, 120, 60_000);
    const token = new URL(req.url).searchParams.get("token")?.trim();
    if (!token) {
      throw new AppError("Missing verification token", 400, "VERIFY_MISSING");
    }
    try {
      await completeEmailVerification({
        token,
        ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
      });
      return redirectTo("/dashboard?verified=1", req);
    } catch (err) {
      if (err instanceof AppError && err.code === "EMAIL_TAKEN") {
        return redirectTo("/login?verified=exists", req);
      }
      return redirectTo("/login?verified=invalid", req);
    }
  });
}
