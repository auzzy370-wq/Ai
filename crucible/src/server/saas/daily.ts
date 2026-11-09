import { prisma } from "@/lib/db";

/** UTC date key YYYY-MM-DD */
export function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export async function ensureDailyChallenge(forDate = new Date()) {
  const key = dateKey(forDate);
  const existing = await prisma.dailyChallenge.findUnique({
    where: { dateKey: key },
    include: { challenge: true },
  });
  if (existing) return existing;

  const coding = await prisma.challenge.findMany({
    where: { isPublished: true, type: "CODING_PROBLEM", isPremium: false },
    orderBy: { slug: "asc" },
  });
  if (!coding.length) {
    const any = await prisma.challenge.findFirst({ where: { isPublished: true } });
    if (!any) throw new Error("No challenges to pick for daily");
    return prisma.dailyChallenge.create({
      data: { dateKey: key, challengeId: any.id },
      include: { challenge: true },
    });
  }
  const pick = coding[hashString(key) % coding.length]!;
  return prisma.dailyChallenge.create({
    data: { dateKey: key, challengeId: pick.id },
    include: { challenge: true },
  });
}

export async function recordDailyCompletion(userId: string, dailyChallengeId: string, dateKeyStr: string) {
  await prisma.dailyChallengeCompletion.upsert({
    where: {
      userId_dailyChallengeId: { userId, dailyChallengeId },
    },
    create: { userId, dailyChallengeId },
    update: {},
  });

  const streak = await prisma.userStreak.findUnique({ where: { userId } });
  const yesterday = new Date(`${dateKeyStr}T12:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yKey = dateKey(yesterday);

  let current = 1;
  if (streak?.lastDateKey === dateKeyStr) {
    current = streak.currentStreak;
  } else if (streak?.lastDateKey === yKey) {
    current = streak.currentStreak + 1;
  }

  const longest = Math.max(current, streak?.longestStreak ?? 0);
  return prisma.userStreak.upsert({
    where: { userId },
    create: { userId, currentStreak: current, longestStreak: longest, lastDateKey: dateKeyStr },
    update: { currentStreak: current, longestStreak: longest, lastDateKey: dateKeyStr },
  });
}
