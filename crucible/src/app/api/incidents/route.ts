import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { startIncidentRun, updateIncidentRun } from "@/server/incidents/service";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const [scenarios, runs] = await Promise.all([
      prisma.incidentScenario.findMany({ orderBy: { title: "asc" } }),
      prisma.incidentRun.findMany({
        where: user.role === "CANDIDATE" ? { candidateId: user.id } : undefined,
        include: { scenario: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return jsonOk({ scenarios, runs });
  });
}

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = await req.json();
    if (body.action === "start") {
      const parsed = z.object({ scenarioSlug: z.string(), assignmentId: z.string().optional() }).parse(body);
      return jsonOk(
        await startIncidentRun({
          scenarioSlug: parsed.scenarioSlug,
          candidateId: user.id,
          assignmentId: parsed.assignmentId,
        }),
        { status: 201 },
      );
    }
    const parsed = z
      .object({
        runId: z.string(),
        diagnosis: z.string().optional(),
        rootCauseFound: z.boolean().optional(),
        fixApplied: z.boolean().optional(),
        regressionTests: z.boolean().optional(),
        recovered: z.boolean().optional(),
        preventionDoc: z.string().optional(),
        timelineEvent: z.string().optional(),
      })
      .parse(body);
    return jsonOk(await updateIncidentRun(parsed.runId, user.id, parsed));
  });
}
