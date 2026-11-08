import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { resolveBootstrapRole } from "@/server/auth/admin-bootstrap";
import { createSession } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";
import type { OAuthProfile } from "./types";

function slugifyName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${base || "candidate"}-${nanoid(6).toLowerCase()}`;
}

/**
 * Find or create a Crucible user from a verified OAuth profile, then open a session.
 */
export async function loginWithOAuthProfile(
  profile: OAuthProfile,
  meta?: { ip?: string; userAgent?: string },
) {
  const email = profile.email.toLowerCase().trim();

  const existingLink = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      },
    },
    include: { user: true },
  });

  let user = existingLink?.user ?? null;

  const { clearPendingRegistration } = await import("@/server/auth/email-verification");
  await clearPendingRegistration(email);

  // Link-by-email only when the provider proved the inbox. Otherwise an attacker
  // could attach Discord/X (or similar) to a victim account that shares an address.
  if (!user) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      include: { oauthAccounts: { select: { id: true }, take: 1 } },
    });
    if (byEmail) {
      if (!profile.emailVerified) {
        throw new AppError(
          "Sign in with a verified email before linking this provider to an existing account",
          403,
          "OAUTH_EMAIL_UNVERIFIED",
        );
      }
      // Password squat: someone registered this address without verifying. Verified
      // OAuth wins — delete the empty unverified shell so the real owner is not linked to it.
      const isUnverifiedPasswordSquat =
        Boolean(byEmail.passwordHash) &&
        !byEmail.emailVerifiedAt &&
        byEmail.oauthAccounts.length === 0;
      if (isUnverifiedPasswordSquat) {
        await prisma.user.delete({ where: { id: byEmail.id } });
      } else {
        user = byEmail;
      }
    }
  }

  // SUPER_ADMIN bootstrap only when this sign-in proved the inbox (or Apple sub allow-list).
  const inboxProven = Boolean(existingLink) || profile.emailVerified;
  const bootstrapRole = inboxProven
    ? resolveBootstrapRole({
        email,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        current: user?.role,
      })
    : (user?.role ?? "CANDIDATE");

  if (!user) {
    if (!profile.emailVerified && !existingLink) {
      throw new AppError(
        "Your identity provider did not verify this email. Use a verified inbox or password signup.",
        403,
        "OAUTH_EMAIL_UNVERIFIED",
      );
    }
    user = await prisma.user.create({
      data: {
        email,
        name: profile.name.slice(0, 120) || email,
        passwordHash: null,
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        role: bootstrapRole,
        plan: bootstrapRole === "SUPER_ADMIN" ? "PREMIUM" : "FREE",
        avatarUrl: profile.avatarUrl ?? null,
        githubLogin: profile.githubLogin ?? null,
        candidateProfile:
          bootstrapRole === "SUPER_ADMIN"
            ? undefined
            : {
                create: {
                  headline: "Candidate",
                  preferredTrack: "SOFTWARE_ENGINEERING",
                  publicSlug: slugifyName(profile.name || email),
                  publicEnabled: false,
                },
              },
      },
    });
  } else {
    const promote =
      bootstrapRole === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN" && inboxProven;
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(profile.avatarUrl && !user.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
        ...(profile.githubLogin && !user.githubLogin ? { githubLogin: profile.githubLogin } : {}),
        ...(profile.emailVerified && !user.emailVerifiedAt ? { emailVerifiedAt: new Date() } : {}),
        ...(promote ? { role: "SUPER_ADMIN", plan: "PREMIUM" } : {}),
        lastLoginAt: new Date(),
      },
    });
  }

  await prisma.oAuthAccount.upsert({
    where: {
      provider_providerUserId: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      },
    },
    create: {
      userId: user.id,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      email,
    },
    update: {
      userId: user.id,
      email,
    },
  });

  await createSession(user.id, meta);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit({
    actorId: user.id,
    action: `auth.oauth.${profile.provider}`,
    entityType: "User",
    entityId: user.id,
    ip: meta?.ip,
    metadata: { provider: profile.provider, emailVerified: profile.emailVerified },
  });

  return user;
}
