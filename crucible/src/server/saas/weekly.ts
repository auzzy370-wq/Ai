import { prisma } from "@/lib/db";

/** ISO week key YYYY-Www */
export function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const WEEKLY_TITLES = [
  "Broken production: checkout double-charge storm",
  "Broken production: auth token exfiltration",
  "Broken production: poisoned queue cascade",
  "Broken production: multi-tenant bleed",
] as const;

export async function ensureWeeklyChallenge(forDate = new Date()) {
  const key = weekKey(forDate);
  const existing = await prisma.weeklyChallenge.findUnique({
    where: { weekKey: key },
    include: { challenge: true, completions: { take: 20, orderBy: { completedAt: "desc" } } },
  });
  if (existing) return existing;

  const pool = await prisma.challenge.findMany({
    where: {
      isPublished: true,
      OR: [
        { type: "PRODUCTION_INCIDENT" },
        { type: "FULL_STACK_SAAS" },
        { type: "SOC_IR" },
        { slug: { in: ["saas-nexus", "soc-nightwatch", "appsec-fortress"] } },
      ],
    },
    orderBy: { slug: "asc" },
  });
  const pick =
    pool[hashString(key) % Math.max(pool.length, 1)] ??
    (await prisma.challenge.findFirst({ where: { isPublished: true } }));
  if (!pick) throw new Error("No challenges for weekly broken-production");

  const title = WEEKLY_TITLES[hashString(key + "t") % WEEKLY_TITLES.length]!;
  return prisma.weeklyChallenge.create({
    data: {
      weekKey: key,
      challengeId: pick.id,
      title,
      synopsis: `This week everyone attempts the same live-fire failure scenario: ${pick.title}. Contain, repair, and prove recovery with evidence — not slides.`,
    },
    include: { challenge: true, completions: true },
  });
}

export async function recordWeeklyCompletion(userId: string, weeklyChallengeId: string, score?: number) {
  return prisma.weeklyChallengeCompletion.upsert({
    where: { userId_weeklyChallengeId: { userId, weeklyChallengeId } },
    create: { userId, weeklyChallengeId, score: score ?? null },
    update: { score: score ?? undefined },
  });
}
