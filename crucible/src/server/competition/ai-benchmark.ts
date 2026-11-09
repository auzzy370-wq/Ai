import { prisma } from "@/lib/db";
import { completeJson, envHasKey } from "@/server/ai/provider";
import { familyHarnessForSlug } from "@/server/execution/coding-family-harness";
import { codingStarterFiles } from "@/server/execution/coding-starters";
import { extractPublicPrompt } from "@/server/competition/prompt-public";
import { canJudgeAiSlug, judgeAiTypescript } from "@/server/competition/ai-local-judge";
import { AppError } from "@/lib/errors";

export type BenchDiagnostics = {
  category:
    | "accepted"
    | "wrong_answer"
    | "runtime_error"
    | "compile_error"
    | "time_limit"
    | "memory_limit"
    | "infrastructure_error"
    | "incomplete";
  publicSummary: string;
  /** Never includes hidden I/O. */
  safeDetail?: string;
};

/**
 * Run an AI model against a challenge.
 * CRITICAL: only the public problem statement is sent to the model.
 * Hidden tests / reference solutions are never included in the prompt.
 */
export async function runAiBenchmark(opts: {
  challengeId: string;
  aiModelId: string;
  actorId?: string;
}) {
  const [challenge, model] = await Promise.all([
    prisma.challenge.findUniqueOrThrow({ where: { id: opts.challengeId } }),
    prisma.aiModel.findUniqueOrThrow({ where: { id: opts.aiModelId } }),
  ]);
  if (!challenge.isPublished) throw new AppError("Challenge not published", 400, "NOT_PUBLISHED");
  if (!model.enabled) throw new AppError("Model disabled", 400, "MODEL_DISABLED");

  if (!canJudgeAiSlug(challenge.slug)) {
    throw new AppError(
      "This challenge has no local coding harness for AI vs Human. Pick an lc-* or q-* coding problem.",
      400,
      "NO_HARNESS",
    );
  }

  const publicPrompt = extractPublicPrompt(challenge);
  const stubHint = solutionStubForPrompt(challenge.slug);

  const run = await prisma.aiBenchmarkRun.create({
    data: {
      challengeId: challenge.id,
      aiModelId: model.id,
      status: "RUNNING",
      resultClass: "experimental",
    },
  });

  const started = Date.now();
  try {
    // Ask model for code — PUBLIC DATA ONLY; route via selected AiModel (Groq / OpenRouter / …)
    const { data, mocked, model: usedModel, provider } = await completeJson<{
      language: string;
      code: string;
      explanation?: string;
    }>({
      system: `You are competing in Crucible AI vs Human.
Return ONE JSON object: {"language":"typescript","code":"<full file>"}.
Rules:
- Implement a correct TypeScript solution that passes the public examples.
- Keep the exact export name from the signature / stub (e.g. twoSum, solve, isValid).
- No markdown fences inside code. No invented hidden tests.
- Prefer O(n) / stated complexity when given.`,
      user: [
        publicPrompt,
        stubHint ? `\n## Starter signature (keep these exports)\n\`\`\`typescript\n${stubHint}\n\`\`\`` : "",
      ].join("\n"),
      providerOverride: {
        name: `${model.provider}:${model.slug}`,
        baseUrl: model.baseUrl ?? undefined,
        model: model.modelId,
        apiKeyEnv: model.apiKeyEnv ?? "GROQ_API_KEY",
      },
      fallback: {
        language: "typescript",
        code: stubHint || `export function solve(...args: unknown[]): unknown {\n  return null;\n}\n`,
        explanation: "Mock fallback — no API key; experimental only.",
      },
    });

    const latencyMs = Date.now() - started;
    if (!data?.code || typeof data.code !== "string" || data.code.trim().length < 20) {
      throw new AppError("Model returned empty or invalid code", 502, "EMPTY_CODE");
    }

    // Real sandbox re-judge (same public + hidden harnesses humans use)
    const judged = mocked
      ? {
          public: {
            passed: 0,
            total: 1,
            runtimeMs: 0,
            firstFailure: "Mocked run — not judged as a real solve.",
            category: "wrong_answer" as const,
          },
          hidden: { passed: 0, total: 0, runtimeMs: 0 },
        }
      : await judgeAiTypescript(challenge.slug, data.code);

    const publicEval = judged.public;
    const hiddenEval = judged.hidden;

    const correct =
      !mocked &&
      publicEval.total > 0 &&
      publicEval.passed === publicEval.total &&
      (hiddenEval.total === 0 || hiddenEval.passed === hiddenEval.total);

    const diagnostics: BenchDiagnostics = correct
      ? { category: "accepted", publicSummary: "All evaluated suites passed." }
      : mocked
        ? {
            category: "incomplete",
            publicSummary: "Experimental mock — configure GROQ_API_KEY / OPENROUTER_API_KEY for verified runs.",
          }
        : publicEval.category === "compile_error" || publicEval.category === "runtime_error"
          ? {
              category: publicEval.category,
              publicSummary: `Public suite ${publicEval.category.replace("_", " ")}.`,
              safeDetail: publicEval.firstFailure,
            }
          : publicEval.passed < publicEval.total
            ? {
                category: "wrong_answer",
                publicSummary: `Public ${publicEval.passed}/${publicEval.total} passed.`,
                safeDetail: publicEval.firstFailure,
              }
            : {
                category: "wrong_answer",
                publicSummary: `Hidden ${hiddenEval.passed}/${hiddenEval.total} passed (inputs not disclosed).`,
              };

    const updated = await prisma.aiBenchmarkRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        resultClass: mocked ? "experimental" : "verified",
        latencyMs,
        runtimeMs: publicEval.runtimeMs || hiddenEval.runtimeMs || latencyMs,
        passedPublic: publicEval.passed,
        totalPublic: publicEval.total,
        passedHidden: hiddenEval.passed,
        totalHidden: hiddenEval.total,
        correct,
        solutionCode: data.code.slice(0, 50_000),
        diagnostics: { ...diagnostics, provider, model: usedModel },
        mocked,
        finishedAt: new Date(),
      },
      include: {
        aiModel: { select: { slug: true, displayName: true, provider: true } },
        challenge: { select: { slug: true, title: true, difficulty: true } },
      },
    });

    return publicAiRunView(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const updated = await prisma.aiBenchmarkRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        resultClass: "experimental",
        errorMessage: message.slice(0, 2000),
        diagnostics: {
          category: "infrastructure_error",
          publicSummary: humanizeProviderError(message),
          safeDetail: message.slice(0, 240),
        } satisfies BenchDiagnostics,
        finishedAt: new Date(),
      },
      include: {
        aiModel: { select: { slug: true, displayName: true, provider: true } },
        challenge: { select: { slug: true, title: true, difficulty: true } },
      },
    });
    // Return a structured failed run instead of throwing — frontend shows the card, not a toast crash.
    return publicAiRunView({ ...updated, correct: false, mocked: true });
  }
}

function humanizeProviderError(message: string): string {
  if (/429/.test(message)) return "Provider rate-limited (429). Wait a moment and retry with Groq GPT-OSS 20B.";
  if (/Unexpected end of JSON|non-whitespace character after JSON/i.test(message)) {
    return "Model returned invalid JSON. Retry with Groq GPT-OSS 20B on Two Sum.";
  }
  if (/NO_HARNESS|no local coding harness/i.test(message)) {
    return "That challenge is not judgable here. Pick Two Sum (or another lc-* problem).";
  }
  if (/EMPTY_CODE/i.test(message)) return "Model returned empty code. Retry with Groq GPT-OSS 20B.";
  return "Provider/infrastructure issue — not counted as the model being incapable.";
}

function solutionStubForPrompt(slug: string): string | null {
  const family = familyHarnessForSlug(slug);
  if (family?.solutionStub) return family.solutionStub.trim();
  const files = codingStarterFiles(slug, "typescript", "SOFTWARE_ENGINEERING");
  const sol = files?.find((f) => f.path === "src/solution.ts");
  return sol?.content.trim() ?? null;
}

export function publicAiRunView(run: {
  id: string;
  status: string;
  resultClass: string;
  latencyMs: number | null;
  runtimeMs: number | null;
  passedPublic: number;
  totalPublic: number;
  passedHidden: number;
  totalHidden: number;
  correct: boolean;
  mocked: boolean;
  diagnostics: unknown;
  errorMessage: string | null;
  createdAt: Date;
  finishedAt: Date | null;
  solutionCode?: string | null;
  aiModel?: { slug: string; displayName: string; provider: string };
  challenge?: { slug: string; title: string; difficulty: number };
}) {
  return {
    id: run.id,
    status: run.status,
    resultClass: run.resultClass,
    latencyMs: run.latencyMs,
    runtimeMs: run.runtimeMs,
    passedPublic: run.passedPublic,
    totalPublic: run.totalPublic,
    passedHidden: run.passedHidden,
    totalHidden: run.totalHidden,
    correct: run.correct,
    mocked: run.mocked,
    diagnostics: run.diagnostics,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    aiModel: run.aiModel,
    challenge: run.challenge,
  };
}

export async function ensureDefaultAiModels() {
  const defaults: {
    slug: string;
    displayName: string;
    provider: string;
    modelId: string;
    baseUrl: string;
    apiKeyEnv: string;
    isOpenSource?: boolean;
    notes: string;
    enabled?: boolean;
  }[] = [
    {
      slug: "groq-gpt-oss-20b",
      displayName: "GPT-OSS 20B (Groq free)",
      provider: "Groq",
      modelId: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKeyEnv: "GROQ_API_KEY",
      isOpenSource: true,
      notes: "Free Groq tier — preferred for AI vs Human. Hidden tests never sent.",
    },
    {
      slug: "groq-qwen3-27b",
      displayName: "Qwen3.8 27B (Groq free)",
      provider: "Groq",
      modelId: "qwen/qwen3.8-27b",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKeyEnv: "GROQ_API_KEY",
      isOpenSource: true,
      notes: "Optional Groq alternate — disabled by default until model id is stable.",
      enabled: false,
    },
    {
      slug: "openrouter-north-mini-code-free",
      displayName: "North Mini Code (OpenRouter free)",
      provider: "OpenRouter",
      modelId: process.env.OPENROUTER_MODEL ?? "cohere/north-mini-code:free",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKeyEnv: "OPENROUTER_API_KEY",
      isOpenSource: true,
      notes: "Often rate-limits / bad JSON — disabled by default.",
      enabled: false,
    },
    {
      slug: "openrouter-gemma-4-31b-free",
      displayName: "Gemma 4 31B (OpenRouter free)",
      provider: "OpenRouter",
      modelId: "google/gemma-4-31b-it:free",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKeyEnv: "OPENROUTER_API_KEY",
      isOpenSource: true,
      notes: "Frequent 429 on free tier — disabled by default.",
      enabled: false,
    },
    {
      slug: "openai-gpt-4o-mini",
      displayName: "GPT-4o mini (paid)",
      provider: "OpenAI",
      modelId: "gpt-4o-mini",
      baseUrl: "https://api.openai.com/v1",
      apiKeyEnv: "OPENAI_API_KEY",
      notes: "Paid OpenAI — optional.",
      enabled: false,
    },
  ];

  for (const d of defaults) {
    await prisma.aiModel.upsert({
      where: { slug: d.slug },
      create: {
        slug: d.slug,
        displayName: d.displayName,
        provider: d.provider,
        modelId: d.modelId,
        baseUrl: d.baseUrl,
        apiKeyEnv: d.apiKeyEnv,
        isOpenSource: Boolean(d.isOpenSource),
        enabled: d.enabled ?? true,
        notes: d.notes,
      },
      update: {
        displayName: d.displayName,
        modelId: d.modelId,
        baseUrl: d.baseUrl,
        apiKeyEnv: d.apiKeyEnv,
        isOpenSource: Boolean(d.isOpenSource),
        // Keep intentional disables sticky unless this slug is the primary Groq model
        ...(d.slug === "groq-gpt-oss-20b" ? { enabled: true } : { enabled: d.enabled ?? false }),
        notes: d.notes,
      },
    });
  }

  // Disable legacy / flaky model slots
  await prisma.aiModel.updateMany({
    where: {
      slug: {
        in: [
          "anthropic-compatible",
          "google-compatible",
          "opensource-local",
          "groq-llama-3.1-8b",
          "groq-llama-3.3-70b",
          "groq-qwen3-27b",
          "openrouter-llama-3.2-3b-free",
          "openrouter-gemma-2-9b-free",
          "openrouter-gemma-4-31b-free",
          "openrouter-north-mini-code-free",
          "openai-gpt-4o-mini",
        ],
      },
    },
    data: { enabled: false },
  });

  const models = await prisma.aiModel.findMany({ where: { enabled: true } });
  // Groq first, then OpenRouter, then others; prefer ones with keys configured
  models.sort((a, b) => {
    const aReady = a.apiKeyEnv && envHasKey(a.apiKeyEnv) ? 0 : 1;
    const bReady = b.apiKeyEnv && envHasKey(b.apiKeyEnv) ? 0 : 1;
    if (aReady !== bReady) return aReady - bReady;
    const rank = (p: string) => (p === "Groq" ? 0 : p === "OpenRouter" ? 1 : 2);
    return rank(a.provider) - rank(b.provider) || a.displayName.localeCompare(b.displayName);
  });
  return models;
}
