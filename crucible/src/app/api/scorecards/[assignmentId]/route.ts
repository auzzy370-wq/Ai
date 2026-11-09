import { prisma } from "@/lib/db";
import { withHandler } from "@/server/auth/api";
import { requireUser, canReview, canManageCandidates } from "@/server/auth/session";
import { AppError } from "@/lib/errors";

/** Employer scorecard — print-friendly HTML / ATS-friendly text export. */
export async function GET(req: Request, ctx: { params: Promise<{ assignmentId: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { assignmentId } = await ctx.params;
    const assignment = await prisma.assessmentAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        candidate: { include: { candidateProfile: { include: { skills: true } } } },
        assessment: { include: { challenge: true } },
        scoreReport: { include: { categories: true } },
        reviews: { orderBy: { createdAt: "desc" }, take: 3 },
        deployments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!assignment) throw new AppError("Not found", 404, "NOT_FOUND");
    const allowed =
      assignment.candidateId === user.id ||
      canReview(user.role) ||
      canManageCandidates(user.role);
    if (!allowed) throw new AppError("Forbidden", 403, "FORBIDDEN");

    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "html";
    const report = assignment.scoreReport;
    const skills =
      assignment.candidate.candidateProfile?.skills.filter((s) => s.source !== "CLAIMED") ?? [];

    if (format === "json") {
      return Response.json({
        ok: true,
        data: {
          candidate: assignment.candidate.name,
          assessment: assignment.assessment.title,
          track: assignment.assessment.track,
          overall: report?.overall ?? null,
          tier: report?.tier ?? null,
          qualified: report?.qualified ?? false,
          categories: report
            ? {
                frontend: report.frontend,
                backend: report.backend,
                database: report.database,
                architecture: report.architecture,
                infrastructure: report.infrastructure,
                security: report.security,
                testing: report.testing,
                problemSolving: report.problemSolving,
                performance: report.performance,
                collaboration: report.collaboration,
              }
            : null,
          verifiedSkills: skills.map((s) => ({ name: s.name, source: s.source })),
          reviews: assignment.reviews.map((r) => ({
            decision: r.decision,
            reasoning: r.reasoning,
            at: r.createdAt,
          })),
        },
      });
    }

    const text = [
      "CRUCIBLE EMPLOYER SCORECARD",
      "===========================",
      `Candidate: ${assignment.candidate.name}`,
      `Assessment: ${assignment.assessment.title}`,
      `Track: ${assignment.assessment.track}`,
      `Overall: ${report?.overall ?? "n/a"} · Tier: ${report?.tier ?? "n/a"} · Qualified: ${report?.qualified ? "YES" : "NO"}`,
      "",
      "Category scores:",
      report
        ? [
            `  Frontend ${report.frontend}`,
            `  Backend ${report.backend}`,
            `  Database ${report.database}`,
            `  Architecture ${report.architecture}`,
            `  Infrastructure ${report.infrastructure}`,
            `  Security ${report.security}`,
            `  Testing ${report.testing}`,
            `  Problem-solving ${report.problemSolving}`,
            `  Performance ${report.performance}`,
            `  Collaboration ${report.collaboration}`,
          ].join("\n")
        : "  (pending)",
      "",
      "Verified skills (non-claimed):",
      ...skills.map((s) => `  - ${s.name} [${s.source}]`),
      "",
      "Human reviews:",
      ...assignment.reviews.map((r) => `  - ${r.decision}: ${r.reasoning}`),
      "",
      "ATS note: Skills above are assessment- or reviewer-verified. Claimed résumé skills are excluded.",
    ].join("\n");

    if (format === "txt" || format === "ats") {
      return new Response(text, {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "content-disposition": `attachment; filename="crucible-scorecard-${assignmentId}.txt"`,
        },
      });
    }

    const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Crucible Scorecard</title>
<style>
  body{font-family:IBM Plex Sans,Segoe UI,sans-serif;background:#0b1220;color:#e5eefb;padding:32px;max-width:800px;margin:0 auto}
  h1{letter-spacing:.2em;font-size:14px;color:#ff5a1f}
  h2{font-size:28px;margin:.4rem 0 1rem}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .cell{border:1px solid #1f2a3d;border-radius:8px;padding:10px 12px;font-family:ui-monospace,monospace;font-size:13px}
  .muted{color:#8aa0b8}
  @media print{body{background:#fff;color:#111} .cell{border-color:#ccc}}
</style></head><body>
<h1>CRUCIBLE · EMPLOYER SCORECARD</h1>
<h2>${escapeHtml(assignment.candidate.name)}</h2>
<p class="muted">${escapeHtml(assignment.assessment.title)} · ${escapeHtml(assignment.assessment.track)}</p>
<p><strong>Overall ${report?.overall ?? "—"}</strong> · ${report?.tier ?? "NOT_QUALIFIED"} · Qualified: ${report?.qualified ? "YES" : "NO"}</p>
<div class="grid">
${
  report
    ? [
        ["Frontend", report.frontend],
        ["Backend", report.backend],
        ["Database", report.database],
        ["Architecture", report.architecture],
        ["Infrastructure", report.infrastructure],
        ["Security", report.security],
        ["Testing", report.testing],
        ["Problem-solving", report.problemSolving],
        ["Performance", report.performance],
        ["Collaboration", report.collaboration],
      ]
        .map(([k, v]) => `<div class="cell">${k}<div style="font-size:18px;margin-top:4px">${v}</div></div>`)
        .join("")
    : "<div class='cell'>Scores pending human review</div>"
}
</div>
<h3 style="margin-top:24px">Verified skills</h3>
<ul>${skills.map((s) => `<li>${escapeHtml(s.name)} <span class="muted">[${s.source}]</span></li>`).join("") || "<li class='muted'>None yet</li>"}</ul>
<h3>Reviewer notes</h3>
<ul>${assignment.reviews.map((r) => `<li><strong>${r.decision}</strong> — ${escapeHtml(r.reasoning)}</li>`).join("") || "<li class='muted'>No reviews</li>"}</ul>
<p class="muted" style="margin-top:32px;font-size:12px">Print this page or download ?format=ats for ATS text. Claimed résumé skills are excluded by design.</p>
<script>/* print helper */</script>
</body></html>`;

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
