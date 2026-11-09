import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { envHasKey } from "@/server/ai/provider";
import { ensureDefaultAiModels } from "@/server/competition/ai-benchmark";

export async function GET() {
  return withHandler(async () => {
    await requireUser();
    const models = await ensureDefaultAiModels();
    const anyFreeKey = envHasKey("GROQ_API_KEY") || envHasKey("OPENROUTER_API_KEY");
    return jsonOk({
      models: models.map((m) => {
        const keyConfigured = Boolean(m.apiKeyEnv && envHasKey(m.apiKeyEnv));
        return {
          id: m.id,
          slug: m.slug,
          displayName: m.displayName,
          provider: m.provider,
          modelId: m.modelId,
          isOpenSource: m.isOpenSource,
          notes: m.notes,
          freeTier: m.provider === "Groq" || m.provider === "OpenRouter",
          keyConfigured,
          ready: keyConfigured,
        };
      }),
      policy: {
        hiddenTests: "never_sent_to_models",
        singleFailImpliesIncapable: false,
        mockedRunsAreExperimental: true,
        preferredFree: "Groq (GROQ_API_KEY) or OpenRouter (OPENROUTER_API_KEY)",
      },
      status: {
        groqReady: envHasKey("GROQ_API_KEY"),
        openRouterReady: envHasKey("OPENROUTER_API_KEY"),
        openaiReady: envHasKey("OPENAI_API_KEY"),
        anyFreeKey,
        hint: anyFreeKey
          ? "Free provider key detected — Submit challenge to model will call a real API."
          : "Add GROQ_API_KEY (console.groq.com) or OPENROUTER_API_KEY in Cursor Secrets to run live free benches.",
      },
    });
  });
}
