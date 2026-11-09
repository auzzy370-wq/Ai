import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { AppError } from "@/lib/errors";

/** Public qualification profile JSON (no auth). */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return withHandler(async () => {
    const { slug } = await ctx.params;
    const profile = await prisma.candidateProfile.findUnique({
      where: { publicSlug: slug },
      include: {
        skills: true,
        projectEvidence: true,
        user: {
          select: {
            name: true,
            assignments: {
              where: { status: { in: ["COMPLETED", "UNDER_REVIEW"] } },
              include: {
                assessment: { select: { title: true, track: true } },
                scoreReport: true,
              },
              orderBy: { updatedAt: "desc" },
              take: 12,
            },
          },
        },
      },
    });
    if (!profile || !profile.publicEnabled) {
      throw new AppError("Profile not found", 404, "NOT_FOUND");
    }
    const verified = profile.skills.filter((s) => s.source === "ASSESSMENT" || s.source === "HUMAN_REVIEW");
    return jsonOk({
      slug: profile.publicSlug,
      name: profile.user.name,
      headline: profile.headline,
      bio: profile.bio,
      track: profile.preferredTrack,
      yearsExperience: profile.yearsExperience,
      verifiedSkills: verified.map((s) => ({
        name: s.name,
        source: s.source,
        confidence: s.confidence,
      })),
      portfolioSkills: profile.skills
        .filter((s) => s.source === "PORTFOLIO")
        .map((s) => ({ name: s.name, source: s.source })),
      assessments: profile.user.assignments.map((a) => ({
        title: a.assessment.title,
        track: a.assessment.track,
        overall: a.scoreReport?.overall ?? null,
        tier: a.scoreReport?.tier ?? null,
        qualified: a.scoreReport?.qualified ?? false,
      })),
      disclaimer:
        "Claimed résumé skills are never shown on public qualification profiles. Only assessment-verified and human-reviewed skills appear as verified.",
    });
  });
}
