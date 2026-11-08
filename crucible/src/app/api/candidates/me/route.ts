import { z } from "zod";
import { AssessmentTrack } from "@prisma/client";
import { optionalSafeHttpUrl } from "@/lib/safe-url";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { ensureCandidateProfile, getCandidateDetail, updateCandidateProfile } from "@/server/candidates/service";
import { assertSameOrigin } from "@/server/security/origin";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    await ensureCandidateProfile(user.id);
    return jsonOk(await getCandidateDetail(user.id));
  });
}

const schema = z.object({
  headline: z.string().optional(),
  bio: z.string().optional(),
  portfolioUrl: optionalSafeHttpUrl,
  githubUrl: optionalSafeHttpUrl,
  linkedInUrl: optionalSafeHttpUrl,
  yearsExperience: z.number().int().min(0).max(60).optional(),
  languages: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  databases: z.array(z.string()).optional(),
  cloud: z.array(z.string()).optional(),
  infrastructure: z.array(z.string()).optional(),
  aiExperience: z.array(z.string()).optional(),
  cybersecurity: z.array(z.string()).optional(),
  preferredTrack: z.nativeEnum(AssessmentTrack).optional(),
  accommodations: z.string().optional(),
  claimedSkills: z.array(z.object({ name: z.string(), domain: z.string() })).optional(),
  publicSlug: z
    .string()
    .regex(/^[a-z0-9-]{3,40}$/)
    .optional()
    .or(z.literal("")),
  publicEnabled: z.boolean().optional(),
});

export async function PUT(req: Request) {
  return withHandler(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = schema.parse(await req.json());
    const updated = await updateCandidateProfile(user.id, {
      ...body,
      portfolioUrl: body.portfolioUrl || undefined,
      githubUrl: body.githubUrl || undefined,
      linkedInUrl: body.linkedInUrl || undefined,
    });
    const { prisma } = await import("@/lib/db");
    await prisma.candidateProfile.update({
      where: { id: updated.id },
      data: {
        cybersecurity: body.cybersecurity,
        languages: body.languages,
        frameworks: body.frameworks,
        databases: body.databases,
        cloud: body.cloud,
        infrastructure: body.infrastructure,
        aiExperience: body.aiExperience,
        yearsExperience: body.yearsExperience,
        preferredTrack: body.preferredTrack,
        publicSlug: body.publicSlug === "" ? null : body.publicSlug || undefined,
        publicEnabled: body.publicEnabled,
      },
    });
    return jsonOk(await getCandidateDetail(user.id));
  });
}
