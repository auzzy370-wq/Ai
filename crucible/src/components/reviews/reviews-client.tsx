"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatScore } from "@/lib/utils";

export function ReviewsClient() {
  const [queue, setQueue] = useState<any[]>([]);
  const [reasoning, setReasoning] = useState(
    "Reviewed repository evidence, automated tests, and AI report. Decision based on verified artifacts.",
  );

  async function load() {
    const res = await fetch("/api/reviews");
    const json = await res.json();
    if (json.ok) setQueue(json.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(assignmentId: string, decision: string) {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        decision,
        reasoning,
        verifiedSkills: decision === "APPROVE" ? ["secure-delivery"] : [],
      }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    toast.success(`Recorded ${decision}`);
    await load();
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">HUMAN TECHNICAL REVIEW</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">AI assists — humans decide</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Inspect evidence-based AI reports, override with documented reasoning, and verify cybersecurity or
          engineering skills explicitly.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Decision reasoning template</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)} />
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {queue.map((item) => {
          const ai = item.submissions?.[0]?.aiEvaluations?.[0]?.report;
          return (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={item.assessment.track === "CYBERSECURITY" ? "violet" : "brand"}>
                    {item.assessment.track}
                  </Badge>
                  <Badge>{item.status}</Badge>
                  {item.scoreReport && <Badge variant="emerald">{formatScore(item.scoreReport.overall)}</Badge>}
                </div>
                <CardTitle className="text-base">
                  {item.candidate.name} — {item.assessment.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <pre className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-black/30 p-3 text-xs">
                  {JSON.stringify(ai ?? { note: "No AI report yet" }, null, 2)}
                </pre>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => decide(item.id, "APPROVE")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => decide(item.id, "REJECT")}>
                    Reject
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => decide(item.id, "REQUEST_FOLLOW_UP")}>
                    Request follow-up
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(item.id, "OVERRIDE_AI")}>
                    Override AI
                  </Button>
                  <a
                    className="inline-flex min-h-10 items-center rounded-md border border-orange-300/60 px-3 text-xs text-orange-800 hover:bg-orange-500/10 sm:min-h-8"
                    href={`/scorecard/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Share scorecard link
                  </a>
                  <a
                    className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-3 text-xs text-slate-800 hover:bg-slate-100 sm:min-h-8"
                    href={`/api/scorecards/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Scorecard PDF
                  </a>
                  <a
                    className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-3 text-xs text-slate-800 hover:bg-slate-100 sm:min-h-8"
                    href={`/api/scorecards/${item.id}?format=ats`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ATS export
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!queue.length && <div className="text-slate-600">No items awaiting review.</div>}
      </div>
    </div>
  );
}
