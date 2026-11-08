import { prisma } from "@/lib/db";
import { canJudgeAiSlug } from "@/server/competition/ai-local-judge";
import { ensureDefaultAiModels, runAiBenchmark } from "@/server/competition/ai-benchmark";
import { logger } from "@/lib/logger";

export type SweepResult = {
  challengeId: string;
  slug: string;
  title: string;
  correct: boolean;
  mocked: boolean;
  status: string;
  passedPublic: number;
  totalPublic: number;
  passedHidden: number;
  totalHidden: number;
  runId?: string;
  error?: string;
};

/**
 * Admin-only: run the selected (or preferred Groq) model through every
 * published assessment challenge that has a local harness, posting each
 * score as an AiBenchmarkRun (leaderboard input).
 */
export async function sweepAiAcrossAssessments(opts: {
  aiModelId?: string;
  limit?: number;
  actorId?: string;
}): Promise<{ modelId: string; modelName: string; results: SweepResult[]; summary: string }> {
  const models = await ensureDefaultAiModels();
  const model =
    (opts.aiModelId ? models.find((m) => m.id === opts.aiModelId) : null) ??
    models.find((m) => m.enabled && m.provider === "Groq") ??
    models.find((m) => m.enabled) ??
    models[0];
  if (!model) throw new Error("No AI model configured");

  const assessments = await prisma.assessment.findMany({
    where: { status: "PUBLISHED" },
    include: {
      challenge: { select: { id: true, slug: true, title: true, isPublished: true, type: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const seen = new Set<string>();
  const targets: { id: string; slug: string; title: string }[] = [];
  for (const a of assessments) {
    const c = a.challenge;
    if (!c?.isPublished || !canJudgeAiSlug(c.slug)) continue;
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    targets.push({ id: c.id, slug: c.slug, title: c.title });
  }

  // Also include published coding bank challenges tied to no assessment yet
  const bank = await prisma.challenge.findMany({
    where: { isPublished: true, type: "CODING_PROBLEM" },
    select: { id: true, slug: true, title: true },
    orderBy: [{ difficulty: "asc" }, { title: "asc" }],
  });
  for (const c of bank) {
    if (!canJudgeAiSlug(c.slug) || seen.has(c.id)) continue;
    seen.add(c.id);
    targets.push(c);
  }

  const limit = Math.min(opts.limit ?? 200, 500);
  const slice = targets.slice(0, limit);
  const results: SweepResult[] = [];

  for (const challenge of slice) {
    try {
      const run = await runAiBenchmark({
        challengeId: challenge.id,
        aiModelId: model.id,
        actorId: opts.actorId,
      });
      results.push({
        challengeId: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        correct: Boolean(run.correct),
        mocked: Boolean(run.mocked),
        status: String(run.status ?? "DONE"),
        passedPublic: Number(run.passedPublic ?? 0),
        totalPublic: Number(run.totalPublic ?? 0),
        passedHidden: Number(run.passedHidden ?? 0),
        totalHidden: Number(run.totalHidden ?? 0),
        runId: String(run.id),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn("ai sweep item failed", { slug: challenge.slug, message });
      results.push({
        challengeId: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        correct: false,
        mocked: false,
        status: "FAILED",
        passedPublic: 0,
        totalPublic: 0,
        passedHidden: 0,
        totalHidden: 0,
        error: message.slice(0, 240),
      });
    }
  }

  const passed = results.filter((r) => r.correct).length;
  const summary = `Posted ${results.length} runs · ${passed} verified clears · model ${model.displayName}`;

  return {
    modelId: model.id,
    modelName: model.displayName,
    results,
    summary,
  };
}
