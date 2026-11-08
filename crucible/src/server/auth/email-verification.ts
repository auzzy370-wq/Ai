import { createHash, randomBytes } from "crypto";
import type { AssessmentTrack } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { sendMail } from "@/server/auth/mail";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24h

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appOrigin(req?: Request) {
  const fromEnv = (
    process.env.APP_URL ||
    process.env.CURSOR_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    if (host) return `${proto}://${host}`;
  }
  return "http://127.0.0.1:3847";
}

function slugifyName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${base || "candidate"}-${randomBytes(3).toString("hex")}`;
}

export async function startPasswordRegistration(opts: {
  name: string;
  email: string;
  password: string;
  track: AssessmentTrack;
  req?: Request;
  ip?: string;
}) {
  const email = opts.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError("Email already registered", 409, "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(opts.password);

  // Local/demo bypass — never enable on public production.
  if (process.env.DEMO_SKIP_EMAIL_VERIFY === "true") {
    const publicSlug = slugifyName(opts.name.trim());
    const user = await prisma.user.create({
      data: {
        email,
        name: opts.name.trim(),
        passwordHash,
        emailVerifiedAt: new Date(),
        role: "CANDIDATE",
        plan: "FREE",
        candidateProfile: {
          create: {
            headline: "Candidate",
            preferredTrack: opts.track,
            publicSlug,
            publicEnabled: false,
            cybersecurity: opts.track === "CYBERSECURITY" ? ["interested"] : [],
          },
        },
        streak: { create: { currentStreak: 0, longestStreak: 0 } },
      },
    });
    await createSession(user.id, { ip: opts.ip });
    await writeAudit({
      actorId: user.id,
      action: "auth.register.demo_bypass",
      entityType: "User",
      entityId: user.id,
      metadata: { track: opts.track, publicSlug },
      ip: opts.ip,
    });
    return { email, needsVerification: false as const, userId: user.id };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.pendingRegistration.upsert({
    where: { email },
    create: {
      email,
      name: opts.name.trim(),
      passwordHash,
      track: opts.track,
      tokenHash,
      expiresAt,
    },
    update: {
      name: opts.name.trim(),
      passwordHash,
      track: opts.track,
      tokenHash,
      expiresAt,
    },
  });

  const verifyUrl = `${appOrigin(opts.req)}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: email,
    subject: "Verify your Crucible email",
    text: `Confirm your Crucible account by opening this link (expires in 24 hours):\n\n${verifyUrl}\n\nIf you did not sign up, ignore this email.`,
    html: `<p>Confirm your Crucible account by opening this link (expires in 24 hours):</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>If you did not sign up, ignore this email.</p>`,
  });

  await writeAudit({
    action: "auth.register.pending",
    entityType: "PendingRegistration",
    entityId: email,
    metadata: { track: opts.track },
    ip: opts.ip,
  });

  return { email, needsVerification: true as const };
}

export async function completeEmailVerification(opts: {
  token: string;
  ip?: string;
  userAgent?: string;
}) {
  const tokenHash = hashToken(opts.token);
  const pending = await prisma.pendingRegistration.findUnique({ where: { tokenHash } });
  if (!pending || pending.expiresAt.getTime() < Date.now()) {
    throw new AppError("Verification link is invalid or expired", 400, "VERIFY_INVALID");
  }

  const existing = await prisma.user.findUnique({ where: { email: pending.email } });
  if (existing) {
    await prisma.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => undefined);
    throw new AppError("Email already registered", 409, "EMAIL_TAKEN");
  }

  const publicSlug = slugifyName(pending.name);
  const user = await prisma.user.create({
    data: {
      email: pending.email,
      name: pending.name,
      passwordHash: pending.passwordHash,
      emailVerifiedAt: new Date(),
      role: "CANDIDATE",
      plan: "FREE",
      candidateProfile: {
        create: {
          headline: "Candidate",
          preferredTrack: pending.track,
          publicSlug,
          publicEnabled: false,
          cybersecurity: pending.track === "CYBERSECURITY" ? ["interested"] : [],
        },
      },
      streak: {
        create: {
          currentStreak: 0,
          longestStreak: 0,
        },
      },
    },
  });

  await prisma.pendingRegistration.delete({ where: { id: pending.id } });
  await createSession(user.id, { ip: opts.ip, userAgent: opts.userAgent });
  await writeAudit({
    actorId: user.id,
    action: "auth.register.verified",
    entityType: "User",
    entityId: user.id,
    metadata: { track: pending.track, publicSlug },
    ip: opts.ip,
  });

  return user;
}

/** Drop an unfinished password signup when verified OAuth claims the same inbox. */
export async function clearPendingRegistration(email: string) {
  await prisma.pendingRegistration.deleteMany({ where: { email: email.toLowerCase().trim() } });
}
