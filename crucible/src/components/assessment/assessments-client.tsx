"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatScore } from "@/lib/utils";

type Challenge = {
  id: string;
  title: string;
  track: string;
  slug: string;
  summary?: string;
  difficulty?: number;
  publicRequirements?: string[];
  tags?: string[];
};
type Assessment = {
  id: string;
  title: string;
  description: string;
  track: string;
  status: string;
  timedMinutes?: number | null;
  challenge: Challenge;
  _count: { assignments: number };
  createdBy: { name: string };
};
type Candidate = { id: string; name: string; email: string };
type Assignment = {
  id: string;
  status: string;
  currentLevel: number;
  maxLevelReached?: number;
  assessment: {
    id: string;
    title: string;
    track: string;
    challenge: {
      summary: string;
      title?: string;
      difficulty?: number;
      publicRequirements?: string[];
      tags?: string[];
      adaptiveTrack?: { level: number; title: string }[] | null;
    };
  };
  candidate: { id: string; name: string; email: string };
  workspace: { id: string } | null;
  scoreReport: { overall: number; qualified: boolean; tier: string } | null;
};

export function AssessmentsClient(props: {
  role: string;
  assessments: Assessment[];
  challenges: Challenge[];
  challengeTotal?: number;
  candidates: Candidate[];
  assignments: Assignment[];
}) {
  const router = useRouter();
  const canManage = ["SUPER_ADMIN", "HIRING_MANAGER"].includes(props.role);
  const libraryTotal = props.challengeTotal ?? props.challenges.length;
  const [title, setTitle] = useState("New Crucible assessment");
  const [description, setDescription] = useState(
    "Demonstrate end-to-end engineering ownership in a timed Crucible session.",
  );
  const [challengeId, setChallengeId] = useState(props.challenges[0]?.id ?? "");
  const [timedMinutes, setTimedMinutes] = useState(60);
  const [assignAssessmentId, setAssignAssessmentId] = useState(props.assessments[0]?.id ?? "");
  const [candidateId, setCandidateId] = useState(props.candidates[0]?.id ?? "");
  const [challengeQuery, setChallengeQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [remoteChallenges, setRemoteChallenges] = useState<Challenge[] | null>(null);
  const [remoteTotal, setRemoteTotal] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(challengeQuery.trim()), 280);
    return () => window.clearTimeout(t);
  }, [challengeQuery]);

  useEffect(() => {
    if (!debouncedQ) {
      setRemoteChallenges(null);
      setRemoteTotal(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: debouncedQ, take: "80", skip: "0" });
        const res = await fetch(`/api/challenges?${params}`);
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { items: Challenge[]; total: number };
        };
        if (cancelled) return;
        if (!res.ok || !json.data?.items) {
          toast.error("Could not search challenge library");
          return;
        }
        setRemoteChallenges(json.data.items);
        setRemoteTotal(json.data.total);
        if (json.data.items[0] && !json.data.items.some((c) => c.id === challengeId)) {
          setChallengeId(json.data.items[0].id);
        }
      } catch {
        if (!cancelled) toast.error("Could not search challenge library");
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-search on query
  }, [debouncedQ]);

  const filteredChallenges = remoteChallenges ?? props.challenges.slice(0, 80);

  async function createAssessment() {
    const res = await fetch("/api/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description, challengeId, timedMinutes }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    toast.success("Assessment created");
    router.refresh();
  }

  async function assign() {
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assessmentId: assignAssessmentId, candidateId }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    toast.success("Assessment assigned + workspace provisioned");
    router.refresh();
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">HIRING · STEP 1</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Create → assign → wait for evidence</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Pick a challenge from the full library, set a timer, assign a candidate. They get an isolated IDE; you review
          after they submit.
        </p>
      </header>

      {canManage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create assessment</CardTitle>
              <CardDescription>Track is inherited from the selected challenge. Default timer: 60 minutes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Challenge</Label>
                <Input
                  placeholder={`Search all ${libraryTotal.toLocaleString()} challenges…`}
                  value={challengeQuery}
                  onChange={(e) => setChallengeQuery(e.target.value)}
                />
                <select
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={challengeId}
                  onChange={(e) => setChallengeId(e.target.value)}
                >
                  {filteredChallenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.track}] {c.title}
                    </option>
                  ))}
                </select>
                <p className="font-mono text-[11px] text-slate-500">
                  {searching
                    ? "Searching library…"
                    : remoteTotal != null
                      ? `Showing ${filteredChallenges.length} of ${remoteTotal.toLocaleString()} matches · ${libraryTotal.toLocaleString()} in library`
                      : `Showing ${filteredChallenges.length} starters · type to search all ${libraryTotal.toLocaleString()}`}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Timed session (minutes)</Label>
                <Input
                  type="number"
                  min={15}
                  max={480}
                  value={timedMinutes}
                  onChange={(e) => setTimedMinutes(Number(e.target.value) || 60)}
                />
              </div>
              <Button onClick={createAssessment}>Publish assessment</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assign to candidate</CardTitle>
              <CardDescription>Provisions Monaco workspace + starter repo for the track.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Assessment</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={assignAssessmentId}
                  onChange={(e) => setAssignAssessmentId(e.target.value)}
                >
                  {props.assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.track}] {a.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Candidate</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                >
                  {props.candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={assign}>Assign + provision workspace</Button>
            </CardContent>
          </Card>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Active assessments</h2>
        <p className="text-sm text-slate-500">
          Assigned or staff-created sessions only — the full challenge bank stays on Evidence / Create.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {!props.assessments.length && (
            <Card className="md:col-span-2">
              <CardContent className="py-10 text-center text-slate-500">
                No active assessments yet. Create one from the library above.
              </CardContent>
            </Card>
          )}
          {props.assessments.map((a) => {
            const reqs = a.challenge.publicRequirements ?? [];
            return (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={a.track === "CYBERSECURITY" || a.track === "CLOUD_INFRA_SECURITY" ? "violet" : a.track === "SECURE_FULL_STACK" || a.track === "HEALTHCARE" ? "emerald" : "brand"}>{a.track}</Badge>
                    <Badge>{a.status}</Badge>
                    <Badge variant="emerald">{a.timedMinutes ?? 60}m</Badge>
                    {a.challenge.difficulty != null && <Badge variant="amber">D{a.challenge.difficulty}</Badge>}
                  </div>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <CardDescription>{a.challenge.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  {a.challenge.summary && <p className="text-slate-700">{a.challenge.summary}</p>}
                  {reqs.length > 0 && (
                    <ul className="space-y-1 text-xs text-slate-500">
                      {reqs.slice(0, 4).map((r) => (
                        <li key={r} className="flex gap-2">
                          <span className="text-orange-500">▸</span>
                          <span>{r}</span>
                        </li>
                      ))}
                      {reqs.length > 4 && <li className="text-slate-600">+{reqs.length - 4} more deliverables</li>}
                    </ul>
                  )}
                  <div>
                    {a._count.assignments} assignments · {a.timedMinutes ?? 60}-minute session · created by{" "}
                    {a.createdBy.name}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Assignments</h2>
        <div className="grid gap-3 md:hidden">
          {props.assignments.map((a) => {
            const ch = a.assessment.challenge;
            const reqs = ch.publicRequirements ?? [];
            return (
              <Card key={a.id}>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className="font-medium text-slate-900">{a.candidate.name}</div>
                  <div className="text-slate-600">{a.assessment.title}</div>
                  <p className="text-xs text-slate-500">{ch.summary}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={a.assessment.track === "CYBERSECURITY" ? "violet" : "brand"}>
                      {a.assessment.track}
                    </Badge>
                    <span className="font-mono text-xs text-slate-700">{a.status}</span>
                    <span className="font-mono text-xs text-emerald-300">L{a.currentLevel}</span>
                    <span className="font-mono text-xs text-orange-700">
                      {a.scoreReport ? formatScore(a.scoreReport.overall) : "—"}
                    </span>
                  </div>
                  {reqs.length > 0 && (
                    <div className="text-[11px] text-slate-500">{reqs.length} deliverables in mission brief</div>
                  )}
                  {a.workspace ? (
                    <Link className="inline-block text-orange-700 hover:underline" href={`/workspace/${a.workspace.id}`}>
                      Open workspace →
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/85 text-slate-600">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Assessment</th>
                <th className="px-4 py-3">Mission</th>
                <th className="px-4 py-3">Track</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Workspace</th>
              </tr>
            </thead>
            <tbody>
              {props.assignments.map((a) => {
                const ch = a.assessment.challenge;
                const reqCount = ch.publicRequirements?.length ?? 0;
                return (
                  <tr key={a.id} className="border-t border-slate-200/80 align-top">
                    <td className="px-4 py-3">{a.candidate.name}</td>
                    <td className="px-4 py-3">
                      <div>{a.assessment.title}</div>
                      <div className="mt-1 max-w-xs text-xs text-slate-500 line-clamp-2">{ch.summary}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {reqCount ? `${reqCount} deliverables` : "—"}
                      {ch.difficulty != null ? ` · D${ch.difficulty}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={a.assessment.track === "CYBERSECURITY" ? "violet" : "brand"}>
                        {a.assessment.track}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-300">L{a.currentLevel}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.status}</td>
                    <td className="px-4 py-3 font-mono">
                      {a.scoreReport ? formatScore(a.scoreReport.overall) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {a.workspace ? (
                        <Link className="text-orange-700 hover:underline" href={`/workspace/${a.workspace.id}`}>
                          Open
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
