import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing";
import { homeForRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/server/auth/session";

/** Guests see the marketing landing; signed-in users go to their role home. */
export default async function Home() {
  try {
    const user = await getSessionUser();
    if (user) redirect(homeForRole(user.role));
  } catch {
    /* db/session unavailable — still show landing */
  }

  let verifiedSkills = 0;
  let publicProfiles = 0;
  let sampleProfileSlug = "casey-elite";
  try {
    const [skillCount, profileCount, sample] = await Promise.all([
      prisma.skillRecord.count({
        where: { source: { in: ["ASSESSMENT", "HUMAN_REVIEW"] } },
      }),
      prisma.candidateProfile.count({
        where: { publicSlug: { not: null }, publicEnabled: true },
      }),
      prisma.candidateProfile.findFirst({
        where: { publicSlug: { not: null }, publicEnabled: true },
        select: { publicSlug: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    verifiedSkills = skillCount;
    publicProfiles = profileCount;
    if (sample?.publicSlug) sampleProfileSlug = sample.publicSlug;
  } catch {
    /* empty stats if DB is down */
  }

  return (
    <LandingPage
      verifiedSkills={verifiedSkills}
      timedSessions={60}
      publicProfiles={publicProfiles}
      sampleProfileSlug={sampleProfileSlug}
    />
  );
}
