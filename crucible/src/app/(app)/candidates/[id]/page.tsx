import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, canReview, canManageCandidates } from "@/server/auth/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatScore } from "@/lib/utils";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || (!canManageCandidates(user.role) && !canReview(user.role))) {
    redirect("/dashboard");
  }
  const { id } = await params;
  const candidate = await prisma.user.findUnique({
    where: { id },
    include: {
      candidateProfile: {
        include: { skills: true, resumes: true, projectEvidence: true },
      },
      assignments: {
        include: { assessment: true, scoreReport: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!candidate) notFound();
  const skills = candidate.candidateProfile?.skills ?? [];

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">CANDIDATE DOSSIER</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{candidate.name}</h1>
        <p className="text-slate-600">{candidate.email}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill lanes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["CLAIMED", "PORTFOLIO", "ASSESSMENT", "HUMAN_REVIEW"] as const).map((source) => (
              <div key={source}>
                <div className="mb-1 text-xs text-slate-500">{source}</div>
                <div className="flex flex-wrap gap-1">
                  {skills
                    .filter((s) => s.source === source)
                    .map((s) => (
                      <Badge key={s.id} variant={source === "CLAIMED" ? "amber" : source === "HUMAN_REVIEW" ? "violet" : "brand"}>
                        {s.name}
                      </Badge>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assessments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {candidate.assignments.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                <div className="font-medium">{a.assessment.title}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant={a.assessment.track === "CYBERSECURITY" ? "violet" : "brand"}>{a.assessment.track}</Badge>
                  <Badge>{a.status}</Badge>
                  {a.scoreReport && <Badge variant="emerald">{formatScore(a.scoreReport.overall)}</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
