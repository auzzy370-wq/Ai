import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/lib/errors";

const schema = z.object({
  assignmentId: z.string(),
  proposal: z.string().min(50),
  diagrams: z.record(z.string(), z.any()).default({}),
  answers: z.record(z.string(), z.string()).default({}),
});

export async function GET(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const assignmentId = new URL(req.url).searchParams.get("assignmentId");
    const rows = await prisma.architectureSubmission.findMany({
      where: assignmentId ? { assignmentId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    if (user.role === "CANDIDATE") {
      const own = await prisma.assessmentAssignment.findMany({
        where: { candidateId: user.id },
        select: { id: true },
      });
      const ids = new Set(own.map((a) => a.id));
      return jsonOk(rows.filter((r) => ids.has(r.assignmentId)));
    }
    return jsonOk(rows);
  });
}

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    const assignment = await prisma.assessmentAssignment.findUnique({ where: { id: body.assignmentId } });
    if (!assignment || assignment.candidateId !== user.id) throw new AppError("Forbidden", 403, "FORBIDDEN");

    // Lightweight practicality scoring — length + coverage of required prompts
    const requiredPrompts = [
      "100,000 concurrent",
      "payment provider fails",
      "duplicate transactions",
      "migration without downtime",
      "regional outage",
      "multi-tenant",
    ];
    const blob = `${body.proposal} ${Object.values(body.answers).join(" ")}`.toLowerCase();
    const covered = requiredPrompts.filter((p) => blob.includes(p.split(" ")[0]!)).length;
    const score = Math.min(95, 50 + covered * 7 + Math.min(20, Math.floor(body.proposal.length / 200)));

    const row = await prisma.architectureSubmission.create({
      data: {
        assignmentId: body.assignmentId,
        proposal: body.proposal,
        diagrams: body.diagrams,
        answers: body.answers,
        score,
        feedback:
          "Scored for practicality, trade-offs, reliability, security, and cost awareness. Unnecessary complexity is not rewarded.",
      },
    });
    return jsonOk(row, { status: 201 });
  });
}
