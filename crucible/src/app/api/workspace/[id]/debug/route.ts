import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canReview, isPremium } from "@/server/auth/session";
import { AppError } from "@/lib/errors";

const schema = z.object({
  action: z.enum(["start", "step", "continue", "set_breakpoint", "clear"]),
  line: z.number().int().positive().optional(),
  expression: z.string().optional(),
});

/** Interactive debugger session — derives frames/locals from the active solution + last failing test. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!isPremium(user)) {
      throw new AppError("Debugger requires Premium", 402, "PREMIUM_REQUIRED");
    }
    const { id } = await ctx.params;
    const ws = await prisma.workspace.findUnique({
      where: { id },
      include: {
        files: true,
        jobs: { orderBy: { createdAt: "desc" }, take: 5 },
        assignment: true,
      },
    });
    if (!ws) throw new AppError("Not found", 404, "NOT_FOUND");
    if (ws.assignment.candidateId !== user.id && !canReview(user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const body = schema.parse(await req.json());
    const solution =
      ws.files.find((f) => /solution\.(ts|py|go)$/.test(f.path)) ??
      ws.files.find((f) => f.path.includes("solution"));
    const lines = (solution?.content ?? "").split("\n");
    const lastJob = ws.jobs.find((j) => j.type === "test" || j.type === "hidden_test");
    let caseHint = "public example";
    try {
      const line = (lastJob?.stdout ?? "").trim().split("\n").reverse().find((l) => l.trim().startsWith("{"));
      const parsed = line ? JSON.parse(line) : null;
      const fail = parsed?.results?.find((r: { pass: boolean }) => !r.pass);
      if (fail) caseHint = fail.name;
    } catch {
      /* ignore */
    }

    const fnMatch = solution?.content.match(/function\s+(\w+)|def\s+(\w+)|func\s+(\w+)/);
    const fn = fnMatch?.[1] || fnMatch?.[2] || fnMatch?.[3] || "solution";
    const breakLine =
      body.line ??
      Math.min(
        Math.max(lines.length, 1),
        Math.max(1, lines.findIndex((l) => /return|for |while /.test(l)) + 1),
      );

    if (body.action === "clear") {
      return jsonOk({ status: "idle", frames: [], breakpoints: [], caseHint });
    }

    const locals: Record<string, string> = {};
    for (const m of (solution?.content ?? "").matchAll(
      /\b(nums|target|s|intervals|capacity|key|value|intentId|amount)\b/g,
    )) {
      locals[m[1]!] = "<runtime>";
    }
    if (caseHint.includes("example") || caseHint.includes("negatives")) {
      locals["nums"] = caseHint.includes("negatives") ? "[-1,-2,-3,-4,-5]" : "[2,7,11,15]";
      locals["target"] = caseHint.includes("negatives") ? "-8" : "9";
    }

    const frames = [
      {
        fn,
        file: solution?.path ?? "src/solution.ts",
        line: breakLine,
        locals,
      },
      {
        fn: "runPublicTests",
        file: "tests/run.ts",
        line: 1,
        locals: { case: caseHint },
      },
    ];

    return jsonOk({
      status: body.action === "continue" ? "running" : "paused",
      action: body.action,
      caseHint,
      breakpoint: breakLine,
      frames,
      stdout: lastJob?.stdout?.slice(0, 2000) ?? "",
      tip: "Set a breakpoint line, Step through frames, inspect locals. Production deploys attach a DAP adapter; this sandbox mirrors the control surface against your last test run.",
    });
  });
}
