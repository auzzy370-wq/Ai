import { z } from "zod";
import { AssessmentTrack, ChallengeType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canAdmin } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import { editorialSlugByChallengeSlug, resolveEditorialSlug } from "@/server/saas/editorials";

const DIFF_BANDS: Record<string, { gte?: number; lte?: number }> = {
  Easy: { gte: 1, lte: 3 },
  Medium: { gte: 4, lte: 6 },
  Hard: { gte: 7, lte: 8 },
  Expert: { gte: 9, lte: 9 },
  Impossible: { gte: 10, lte: 10 },
};

export async function GET(req: Request) {
  return withHandler(async () => {
    const { searchParams } = new URL(req.url);
    const track = searchParams.get("track");
    const typeRaw = searchParams.get("type");
    const q = searchParams.get("q")?.trim() || "";
    const company = searchParams.get("company")?.trim() || "";
    const tag = searchParams.get("tag")?.trim() || "";
    const diff =
      searchParams.get("diff")?.trim() ||
      searchParams.get("difficulty")?.trim() ||
      "";
    const skip = Math.max(Number(searchParams.get("skip") || 0), 0);
    const take = Math.min(Math.max(Number(searchParams.get("take") || 50), 1), 100);
    const library = searchParams.get("library")?.trim() || "core";
    const user = await requireUser();

    let typeFilter: Prisma.ChallengeWhereInput = {};
    if (typeRaw === "CODING_PROBLEM") {
      typeFilter = { type: ChallengeType.CODING_PROBLEM };
    } else if (typeRaw === "PROJECT" || typeRaw === "projects") {
      typeFilter = { type: { not: ChallengeType.CODING_PROBLEM } };
    } else if (typeRaw && Object.values(ChallengeType).includes(typeRaw as ChallengeType)) {
      typeFilter = { type: typeRaw as ChallengeType };
    }

    const coreOnly: Prisma.ChallengeWhereInput =
      library === "all"
        ? {}
        : {
            NOT: {
              OR: [{ slug: { startsWith: "q-" } }, { slug: { startsWith: "exp-" } }],
            },
          };

    const where: Prisma.ChallengeWhereInput = {
      isPublished: true,
      ...typeFilter,
      ...coreOnly,
      ...(track ? { track: track as AssessmentTrack } : {}),
      ...(company && company !== "All" ? { companies: { has: company } } : {}),
      ...(tag && tag !== "All" && tag !== "coding" ? { tags: { has: tag } } : {}),
      ...(DIFF_BANDS[diff] ? { difficulty: DIFF_BANDS[diff] } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { summary: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
              { companies: { has: q } },
            ],
          }
        : {}),
    };

  const [total, challenges, editorialMap, difficultyRows] = await Promise.all([
      prisma.challenge.count({ where }),
      prisma.challenge.findMany({
        where,
        orderBy: [{ frequency: "desc" }, { title: "asc" }],
        skip,
        take,
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          description: canAdmin(user.role),
          type: true,
          track: true,
          difficulty: true,
          estimatedDays: true,
          tags: true,
          companies: true,
          frequency: true,
          avgMinutes: true,
          isPremium: true,
          languages: true,
          publicRequirements: true,
          owaspMappings: true,
          mitreMappings: true,
          assessments: {
            where: { status: "PUBLISHED" },
            take: 1,
            select: { id: true },
          },
        },
      }),
      editorialSlugByChallengeSlug(),
      // Band totals for the coding library (ignore active difficulty so pills stay honest).
      typeRaw === "CODING_PROBLEM"
        ? prisma.challenge.groupBy({
            by: ["difficulty"],
            where: {
              isPublished: true,
              type: ChallengeType.CODING_PROBLEM,
              ...coreOnly,
              ...(track ? { track: track as AssessmentTrack } : {}),
              ...(company && company !== "All" ? { companies: { has: company } } : {}),
              ...(tag && tag !== "All" && tag !== "coding" ? { tags: { has: tag } } : {}),
              ...(q
                ? {
                    OR: [
                      { title: { contains: q, mode: "insensitive" } },
                      { slug: { contains: q, mode: "insensitive" } },
                      { summary: { contains: q, mode: "insensitive" } },
                      { tags: { has: q } },
                      { companies: { has: q } },
                    ],
                  }
                : {}),
            },
            _count: { _all: true },
          })
        : Promise.resolve([] as { difficulty: number; _count: { _all: number } }[]),
    ]);

    const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0, Expert: 0, Impossible: 0 };
    for (const row of difficultyRows) {
      const d = row.difficulty;
      const n = row._count._all;
      if (d <= 3) difficultyCounts.Easy += n;
      else if (d <= 6) difficultyCounts.Medium += n;
      else if (d <= 8) difficultyCounts.Hard += n;
      else if (d === 9) difficultyCounts.Expert += n;
      else difficultyCounts.Impossible += n;
    }

    return jsonOk({
      items: challenges.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        description: canAdmin(user.role) ? c.description : undefined,
        type: c.type,
        track: c.track,
        difficulty: c.difficulty,
        estimatedDays: c.estimatedDays,
        tags: c.tags,
        companies: c.companies,
        frequency: c.frequency,
        avgMinutes: c.avgMinutes,
        isPremium: c.isPremium,
        languages: c.languages,
        publicRequirements: c.publicRequirements,
        owaspMappings: c.owaspMappings,
        mitreMappings: c.mitreMappings,
        assessmentId: c.assessments[0]?.id ?? null,
        editorialSlug: resolveEditorialSlug(c.slug, editorialMap),
      })),
      total,
      skip,
      take,
      hasMore: skip + challenges.length < total,
      difficultyCounts,
    });
  });
}

const createSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(3),
  summary: z.string().min(3),
  description: z.string().min(10),
  type: z.nativeEnum(ChallengeType),
  track: z.nativeEnum(AssessmentTrack),
  difficulty: z.number().int().min(1).max(10),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser(["SUPER_ADMIN"]);
    if (!canAdmin(user.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");
    const body = createSchema.parse(await req.json());
    const challenge = await prisma.challenge.create({
      data: {
        ...body,
        publicRequirements: [],
        hiddenRequirements: [],
        gradingRubric: {},
        adaptiveTrack: [],
      },
    });
    return jsonOk(challenge, { status: 201 });
  });
}
