import { AppError } from "@/lib/errors";
import { rateLimit } from "@/server/security/rate-limit";

/**
 * Progressive delay + hard lock after repeated failures for an email+IP pair.
 */
export async function assertLoginAllowed(email: string, ip: string) {
  await rateLimit(`login-ip:${ip}`, 40, 60_000);
  await rateLimit(`login-email:${email.toLowerCase()}`, 15, 60_000);
}

export async function recordLoginFailure(email: string, ip: string) {
  // Tight bucket: after 8 failures in 15m, block further attempts for that window.
  try {
    await rateLimit(`login-fail:${ip}:${email.toLowerCase()}`, 8, 15 * 60_000);
  } catch (err) {
    if (err instanceof AppError && err.code === "RATE_LIMITED") {
      throw new AppError(
        "Too many failed sign-in attempts. Wait 15 minutes or reset your password.",
        429,
        "LOGIN_LOCKED",
      );
    }
    throw err;
  }
}
