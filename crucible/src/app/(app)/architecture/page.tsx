"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const PROMPTS = [
  "How would you support 100,000 concurrent users?",
  "What happens if a payment provider fails during checkout?",
  "How would you prevent duplicate transactions?",
  "How would you handle a database migration without downtime?",
  "How would you recover from a regional infrastructure outage?",
  "How would you isolate customer data in a multi-tenant application?",
  "How would you scale a video processing pipeline?",
  "For cybersecurity: how would you detect and contain a stolen service token?",
];

export default function ArchitecturePage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [proposal, setProposal] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/assignments");
      const json = await res.json();
      if (json.ok) {
        setAssignments(json.data);
        setAssignmentId(json.data[0]?.id ?? "");
      }
    })();
  }, []);

  async function submit() {
    const res = await fetch("/api/architecture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        proposal,
        diagrams: { note: "Describe diagrams in proposal text for this MVP surface" },
        answers,
      }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    toast.success(`Architecture scored ${json.data.score}`);
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">ARCHITECTURE ASSESSMENT</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Design before you build</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Practicality, trade-offs, reliability, security, and cost awareness. Unnecessary complexity is penalized.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.assessment?.title || a.id}
              </option>
            ))}
          </select>
          <Textarea
            className="min-h-[160px]"
            placeholder="Written design proposal, trust boundaries, data stores, failure modes…"
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
          />
          {PROMPTS.map((p) => (
            <div key={p} className="space-y-1">
              <div className="text-sm text-slate-700">{p}</div>
              <Textarea
                value={answers[p] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [p]: e.target.value })}
              />
            </div>
          ))}
          <Button onClick={submit}>Submit architecture package</Button>
        </CardContent>
      </Card>
    </div>
  );
}
