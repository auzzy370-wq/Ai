import { z } from "zod";
import { AssessmentTrack } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { startPasswordRegistration } from "@/server/auth/email-verification";
import { clientIp } from "@/server/security/client-ip";
import { assertSameOrigin } from "@/server/security/origin";
import { rateLimit } from "@/server/security/rate-limit";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(200)
    .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), {
      message: "Password needs at least one letter and one number",
    }),
  track: z.nativeEnum(AssessmentTrack).default("SOFTWARE_ENGINEERING"),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    assertSameOrigin(req);
    const ip = clientIp(req);
    await rateLimit(`register:${ip}`, 10);
    await rateLimit(`register-global`, 60, 60_000);
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    // Keep seeded demo identities reserved so real signups don't collide with demos
    if (email.endsWith("@crucible.local") || email.endsWith("@crucible.internal") || email.endsWith("@gauntlet.local")) {
      throw new AppError(
        "That email domain is reserved for demo accounts. Use your real email to register.",
        400,
        "DEMO_EMAIL_RESERVED",
      );
    }

    const { ensurePlatformSeeded } = await import("@/server/platform/ensure-seeded");
    await ensurePlatformSeeded();

    const result = await startPasswordRegistration({
      name: body.name,
      email,
      password: body.password,
      track: body.track,
      req,
      ip,
    });

    return jsonOk({
      needsVerification: result.needsVerification,
      email: result.email,
      message: result.needsVerification
        ? "Check your email for a verification link to finish creating your account."
        : "Account created — you’re signed in.",
    });
  });
}
