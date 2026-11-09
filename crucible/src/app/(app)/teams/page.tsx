"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/teams");
    const json = await res.json();
    if (json.ok) setTeams(json.data);
  }
  useEffect(() => {
    void load();
  }, []);

  async function discuss(teamId: string) {
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "discuss", teamId, body: message }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    setMessage("");
    await load();
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">TEAM COLLABORATION</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Shared delivery assessments</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Evaluate observable engineering collaboration — contracts, reviews, integration — not personality fit.
          Cybersecurity purple-team exercises can also run as team challenges.
        </p>
      </header>
      {teams.map((team) => (
        <Card key={team.id}>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant="brand">{team.assessment.track}</Badge>
              <Badge>{team.members.length} members</Badge>
            </div>
            <CardTitle>{team.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              {team.members.map((m: any) => (
                <Badge key={m.id} variant="emerald">
                  {m.user.name} · {m.roleLabel}
                </Badge>
              ))}
            </div>
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              {team.discussions.map((d: any) => (
                <div key={d.id} className="text-slate-600">
                  <span className="font-mono text-xs text-slate-500">{new Date(d.createdAt).toLocaleString()}</span>
                  <div>{d.body}</div>
                </div>
              ))}
            </div>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Technical discussion note" />
            <Button size="sm" onClick={() => discuss(team.id)}>
              Post discussion
            </Button>
          </CardContent>
        </Card>
      ))}
      {!teams.length && (
        <Card>
          <CardContent className="py-8 text-slate-600">
            No teams yet. Hiring managers create 2–4 person teams from the assessments API / admin tools.
            <div className="mt-4">
              <CreateTeamDemo onCreated={load} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateTeamDemo({ onCreated }: { onCreated: () => void }) {
  const [assessmentId, setAssessmentId] = useState("");
  const [memberA, setMemberA] = useState("");
  const [memberB, setMemberB] = useState("");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      const [a, c] = await Promise.all([fetch("/api/assessments"), fetch("/api/candidates")]);
      const aj = await a.json();
      const cj = await c.json();
      if (aj.ok) {
        setAssessments(aj.data.filter((x: any) => x.allowTeam || x.track === "SECURE_FULL_STACK"));
        setAssessmentId(aj.data.find((x: any) => x.allowTeam)?.id ?? aj.data[0]?.id ?? "");
      }
      if (cj.ok) {
        setCandidates(cj.data);
        setMemberA(cj.data[0]?.id ?? "");
        setMemberB(cj.data[1]?.id ?? cj.data[0]?.id ?? "");
      }
    })();
  }, []);

  async function create() {
    if (!memberA || !memberB || memberA === memberB) return toast.error("Pick two distinct members");
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Forge Squad Alpha",
        assessmentId,
        members: [
          { userId: memberA, roleLabel: "API owner", duties: "Contracts + backend" },
          { userId: memberB, roleLabel: "Client/security", duties: "UI + threat checks" },
        ],
      }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    toast.success("Team created");
    onCreated();
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-4">
      <div className="text-sm text-slate-700">Create team (managers)</div>
      <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
        {assessments.map((a) => (
          <option key={a.id} value={a.id}>{a.title}</option>
        ))}
      </select>
      <div className="grid gap-2 md:grid-cols-2">
        <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={memberA} onChange={(e) => setMemberA(e.target.value)}>
          {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={memberB} onChange={(e) => setMemberB(e.target.value)}>
          {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <Button size="sm" onClick={create}>Create 2-person team</Button>
    </div>
  );
}
