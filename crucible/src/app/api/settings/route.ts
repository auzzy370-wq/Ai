import { z } from "zod";
import { cookies } from "next/headers";
import { AssessmentTrack } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { optionalSafeHttpUrl } from "@/lib/safe-url";
import { jsonOk, withHandler } from "@/server/auth/api";
import { SESSION_COOKIE, requireUser } from "@/server/auth/session";
import { ensureCandidateProfile } from "@/server/candidates/service";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { writeAudit } from "@/server/security/audit";
import { assertSameOrigin } from "@/server/security/origin";

const COOKIE = SESSION_COOKIE;

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    const [sessions, currentSession, profile, streak, assignmentCount, playgroundCount] = await Promise.all([
      prisma.session.findMany({
        where: { userId: user.id, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, createdAt: true, expiresAt: true, ip: true, userAgent: true },
      }),
      token
        ? prisma.session.findFirst({
            where: { userId: user.id, token, expiresAt: { gt: new Date() } },
            select: { id: true },
          })
        : Promise.resolve(null),
      user.role === "CANDIDATE" || user.role === "TEAM_MEMBER"
        ? ensureCandidateProfile(user.id).then(() =>
            prisma.candidateProfile.findUnique({ where: { userId: user.id } }),
          )
        : Promise.resolve(null),
      prisma.userStreak.findUnique({ where: { userId: user.id } }),
      prisma.assessmentAssignment.count({ where: { candidateId: user.id } }),
      prisma.playground.count({ where: { userId: user.id } }),
    ]);

    return jsonOk({
      account: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
        githubLogin: user.githubLogin,
        avatarUrl: user.avatarUrl,
      },
      profile: profile
        ? {
            preferredTrack: profile.preferredTrack,
            publicEnabled: profile.publicEnabled,
            publicSlug: profile.publicSlug,
            accommodations: profile.accommodations,
            headline: profile.headline,
            bio: profile.bio,
            portfolioUrl: profile.portfolioUrl,
            githubUrl: profile.githubUrl,
            linkedInUrl: profile.linkedInUrl,
            yearsExperience: profile.yearsExperience,
            languages: profile.languages,
            frameworks: profile.frameworks,
            databases: profile.databases,
            cloud: profile.cloud,
            infrastructure: profile.infrastructure,
            cybersecurity: profile.cybersecurity,
          }
        : null,
      stats: {
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        assignments: assignmentCount,
        playgrounds: playgroundCount,
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        ip: s.ip,
        userAgent: s.userAgent,
        current: Boolean(currentSession && s.id === currentSession.id),
      })),
      environment: {
        appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || null,
        executionMode: process.env.EXECUTION_MODE ?? "docker",
        aiMock: process.env.AI_FALLBACK_MOCK !== "false",
      },
    });
  });
}

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  githubLogin: z.string().max(40).optional().or(z.literal("")),
  preferredTrack: z.nativeEnum(AssessmentTrack).optional(),
  accommodations: z.string().max(2000).optional(),
  headline: z.string().max(160).optional().or(z.literal("")),
  bio: z.string().max(4000).optional().or(z.literal("")),
  portfolioUrl: optionalSafeHttpUrl,
  githubUrl: optionalSafeHttpUrl,
  linkedInUrl: optionalSafeHttpUrl,
  yearsExperience: z.number().int().min(0).max(60).nullable().optional(),
  publicEnabled: z.boolean().optional(),
  publicSlug: z
    .string()
    .regex(/^[a-z0-9-]{3,40}$/)
    .optional()
    .or(z.literal("")),
  languages: z.array(z.string()).max(40).optional(),
  frameworks: z.array(z.string()).max(40).optional(),
  databases: z.array(z.string()).max(40).optional(),
  cloud: z.array(z.string()).max(40).optional(),
  infrastructure: z.array(z.string()).max(40).optional(),
  cybersecurity: z.array(z.string()).max(40).optional(),
});

export async function PATCH(req: Request) {
  return withHandler(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = patchSchema.parse(await req.json());

    if (body.name || body.githubLogin !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(body.githubLogin !== undefined
            ? { githubLogin: body.githubLogin === "" ? null : body.githubLogin }
            : {}),
        },
      });
    }

    const profileTouched =
      body.preferredTrack !== undefined ||
      body.accommodations !== undefined ||
      body.headline !== undefined ||
      body.bio !== undefined ||
      body.portfolioUrl !== undefined ||
      body.githubUrl !== undefined ||
      body.linkedInUrl !== undefined ||
      body.yearsExperience !== undefined ||
      body.publicEnabled !== undefined ||
      body.publicSlug !== undefined ||
      body.languages ||
      body.frameworks ||
      body.databases ||
      body.cloud ||
      body.infrastructure ||
      body.cybersecurity;

    if (profileTouched) {
      await ensureCandidateProfile(user.id);
      const emptyToNull = (v: string | undefined) => (v === "" ? null : v);
      await prisma.candidateProfile.update({
        where: { userId: user.id },
        data: {
          ...(body.preferredTrack ? { preferredTrack: body.preferredTrack } : {}),
          ...(body.accommodations !== undefined ? { accommodations: body.accommodations } : {}),
          ...(body.headline !== undefined ? { headline: emptyToNull(body.headline) } : {}),
          ...(body.bio !== undefined ? { bio: emptyToNull(body.bio) } : {}),
          ...(body.portfolioUrl !== undefined ? { portfolioUrl: emptyToNull(body.portfolioUrl) } : {}),
          ...(body.githubUrl !== undefined ? { githubUrl: emptyToNull(body.githubUrl) } : {}),
          ...(body.linkedInUrl !== undefined ? { linkedInUrl: emptyToNull(body.linkedInUrl) } : {}),
          ...(body.yearsExperience !== undefined ? { yearsExperience: body.yearsExperience } : {}),
          ...(body.publicEnabled !== undefined ? { publicEnabled: body.publicEnabled } : {}),
          ...(body.publicSlug !== undefined
            ? { publicSlug: body.publicSlug === "" ? null : body.publicSlug }
            : {}),
          ...(body.languages ? { languages: body.languages } : {}),
          ...(body.frameworks ? { frameworks: body.frameworks } : {}),
          ...(body.databases ? { databases: body.databases } : {}),
          ...(body.cloud ? { cloud: body.cloud } : {}),
          ...(body.infrastructure ? { infrastructure: body.infrastructure } : {}),
          ...(body.cybersecurity ? { cybersecurity: body.cybersecurity } : {}),
        },
      });
    }

    await writeAudit({
      action: "settings.update",
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
      metadata: { fields: Object.keys(body) },
    });

    return jsonOk({ ok: true });
  });
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(128),
});

export async function PUT(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = passwordSchema.parse(await req.json());
    if (!/[A-Za-z]/.test(body.newPassword) || !/[0-9]/.test(body.newPassword)) {
      throw new AppError("Password needs a letter and a number", 400, "WEAK_PASSWORD");
    }
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const ok = await verifyPassword(body.currentPassword, row.passwordHash);
    if (!ok) throw new AppError("Current password is incorrect", 400, "BAD_PASSWORD");
    const passwordHash = await hashPassword(body.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await writeAudit({
      action: "settings.password_change",
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
    });
    return jsonOk({ ok: true });
  });
}
