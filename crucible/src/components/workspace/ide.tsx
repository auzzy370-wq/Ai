"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SessionTimer } from "@/components/assessment/session-timer";
import { PracticeAssist } from "@/components/workspace/practice-assist";
import { cn } from "@/lib/utils";
import { difficultyBand, difficultyBandClass, type DifficultyBand } from "@/lib/difficulty";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type FileRow = { id: string; path: string; content: string; language: string | null };

type CaseResult = { name: string; pass: boolean; hidden?: boolean };

function difficultyLabel(difficulty: number): DifficultyBand {
  return difficultyBand(difficulty);
}

function diffClass(difficulty: number) {
  return difficultyBandClass(difficultyBand(difficulty));
}

type Pinpoint = {
  summary: string;
  verdict: string;
  band: string;
  difficulty: number;
  knows: { name: string; domain: string; evidence: string[] }[];
  gaps: { name: string; domain: string; status: string; evidence: string[] }[];
  nextFocus: string[];
  ceiling: { note: string };
};

function renderProblemBody(md: string) {
  // Lightweight markdown-ish rendering for problem statements
  const blocks = md.split(/\n\n+/);
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    if (lines[0]?.startsWith("## ")) {
      return (
        <div key={i} className="space-y-2">
          <h3 className="text-sm font-semibold tracking-wide text-slate-900">{lines[0].replace(/^##\s+/, "")}</h3>
          {lines.slice(1).map((l, j) => (
            <p key={j} className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              {formatInline(l)}
            </p>
          ))}
        </div>
      );
    }
    if (lines[0]?.startsWith("```")) {
      const code = lines.slice(1).filter((l) => !l.startsWith("```")).join("\n");
      return (
        <pre
          key={i}
          className="overflow-x-auto rounded-lg border border-[var(--code-chip-border)] bg-[var(--code-block-bg)] p-3 font-mono text-xs text-[var(--code-block-fg)]"
        >
          {code}
        </pre>
      );
    }
    return (
      <p key={i} className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
        {lines.map((l, j) => (
          <span key={j}>
            {formatInline(l)}
            {j < lines.length - 1 ? "\n" : null}
          </span>
        ))}
      </p>
    );
  });
}

function formatInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded border border-[var(--code-chip-border)] bg-[var(--code-chip-bg)] px-1.5 py-0.5 font-mono text-[12px] font-medium text-[var(--code-chip-fg)]"
        >
          {p.slice(1, -1)}
        </code>
      );
    }
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function WorkspaceIde(props: {
  workspaceId: string;
  assignmentId: string;
  title: string;
  track: string;
  language: string;
  files: FileRow[];
  commits: { sha: string; message: string; createdAt: string }[];
  jobs: {
    id: string;
    type: string;
    status: string;
    stdout: string | null;
    stderr: string | null;
    diagnostic?: {
      category: string;
      contestantFault: boolean;
      public: boolean;
      summary: string;
      expected?: string;
      actual?: string;
      hint?: string;
    };
  }[];
  role: string;
  timedMinutes?: number | null;
  dueAt?: string | null;
  startedAt?: string | null;
  codingMode?: boolean;
  challengeSlug?: string;
  challengeId?: string;
  difficulty?: number;
  tags?: string[];
  problemDescription?: string;
  problemSummary?: string;
  premium?: boolean;
  companies?: string[];
  isPremiumContent?: boolean;
  publicRequirements?: string[];
  hiddenRequirements?: string[];
  adaptiveTrack?: { level: number; title: string; criteria: string }[];
  gradingRubric?: Record<string, string>;
  currentLevel?: number;
  maxLevelReached?: number;
  owaspMappings?: string[];
  mitreMappings?: string[];
  judgeOnline?: boolean;
  judgeDetail?: string;
}) {
  const router = useRouter();
  const coding = Boolean(props.codingMode);
  const premium = Boolean(props.premium);
  const judgeOnline = props.judgeOnline === true;
  const [debuggerOpen, setDebuggerOpen] = useState(false);
  const [debugState, setDebugState] = useState<{
    status: string;
    frames: { fn: string; file: string; line: number; locals: Record<string, string> }[];
    caseHint?: string;
    tip?: string;
    breakpoint?: number;
  } | null>(null);
  const [bpLine, setBpLine] = useState(1);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const preferred = coding
    ? props.files.find((f) => f.path === "src/solution.ts")?.path ??
      props.files.find((f) => f.path === "src/solution.py")?.path ??
      props.files.find((f) => f.path.endsWith("solution.ts") || f.path.endsWith("solution.py") || f.path.endsWith("solution.go"))?.path
    : undefined;
  const [files, setFiles] = useState(props.files);
  const [activePath, setActivePath] = useState(preferred ?? props.files[0]?.path ?? "README.md");
  const active = useMemo(() => files.find((f) => f.path === activePath), [files, activePath]);
  const [commitMsg, setCommitMsg] = useState(coding ? "feat: solve coding problem" : "feat: progress on assessment");
  const [terminal, setTerminal] = useState(() => {
    if (props.judgeOnline === true) {
      return coding
        ? "Ready. Run public tests, then Submit for hidden evaluation.\n"
        : "Ready. Tests execute in an isolated worker/sandbox.\n";
    }
    return `Judge offline. ${props.judgeDetail ?? "Attach a Docker worker and set JUDGE_ONLINE=true."}\n`;
  });
  const [busy, setBusy] = useState(false);
  const [caseResults, setCaseResults] = useState<CaseResult[]>([]);
  const [judgeVerdict, setJudgeVerdict] = useState<{
    label: "Accepted" | "Wrong Answer" | "Hidden failed" | "Pending";
    publicPassed: number;
    publicTotal: number;
    hiddenPassed: number;
    hiddenTotal: number;
  } | null>(null);
  const [lastDiagnostic, setLastDiagnostic] = useState<{
    category: string;
    contestantFault: boolean;
    public: boolean;
    summary: string;
    expected?: string;
    actual?: string;
    hint?: string;
  } | null>(null);
  const [pinpoint, setPinpoint] = useState<Pinpoint | null>(null);
  const [panel, setPanel] = useState<"problem" | "code">("problem");
  const [projectPanel, setProjectPanel] = useState<"brief" | "code" | "evidence">("brief");
  const [checkedDeliverables, setCheckedDeliverables] = useState<Record<string, boolean>>({});
  const editorRef = useRef<{ editor: any; monaco: any } | null>(null);

  async function refreshPinpoint(results?: CaseResult[]) {
    try {
      const res = await fetch(`/api/workspace/${props.workspaceId}/diagnostics`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ results: results ?? caseResults }),
      });
      const json = await res.json();
      if (json.ok && json.data?.pinpoint) setPinpoint(json.data.pinpoint);
    } catch {
      /* non-blocking */
    }
  }

  const publicReqs = props.publicRequirements ?? [];
  const hiddenReqs = props.hiddenRequirements ?? [];
  const adaptive = props.adaptiveTrack ?? [];
  const rubric = props.gradingRubric ?? {};
  const deliverableDone = publicReqs.filter((r) => checkedDeliverables[r]).length;

  function applyVerdict(results: CaseResult[]) {
    const pub = results.filter((r) => !r.hidden);
    const hid = results.filter((r) => r.hidden);
    const publicPassed = pub.filter((r) => r.pass).length;
    const hiddenPassed = hid.filter((r) => r.pass).length;
    let label: "Accepted" | "Wrong Answer" | "Hidden failed" | "Pending" = "Pending";
    if (pub.length || hid.length) {
      if (pub.some((r) => !r.pass)) label = "Wrong Answer";
      else if (hid.length && hid.some((r) => !r.pass)) label = "Hidden failed";
      else if (pub.length && (!hid.length || hid.every((r) => r.pass))) label = "Accepted";
      else if (!pub.length && hid.every((r) => r.pass)) label = "Accepted";
      else label = "Wrong Answer";
    }
    setJudgeVerdict({
      label,
      publicPassed,
      publicTotal: pub.length,
      hiddenPassed,
      hiddenTotal: hid.length,
    });
  }

  async function save(content: string) {
    setFiles((prev) => prev.map((f) => (f.path === activePath ? { ...f, content } : f)));
    const res = await fetch(`/api/workspace/${props.workspaceId}/files`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: activePath, content, language: active?.language }),
    });
    const json = await res.json();
    if (!json.ok) toast.error(json.error?.message || "Save failed");
  }

  async function commit() {
    const res = await fetch(`/api/workspace/${props.workspaceId}/commit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: commitMsg }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Commit failed");
    toast.success(`Committed ${json.data.sha}`);
    router.refresh();
  }

  function parseCases(stdout: string | null | undefined): CaseResult[] {
    if (!stdout) return [];
    try {
      const line = stdout
        .trim()
        .split("\n")
        .reverse()
        .find((l) => l.trim().startsWith("{"));
      if (!line) return [];
      const parsed = JSON.parse(line) as { results?: CaseResult[] };
      return parsed.results ?? [];
    } catch {
      return [];
    }
  }

  async function run(type: "test" | "hidden_test" | "deploy_check") {
    if (!judgeOnline) {
      toast.error("Judge offline — Docker worker not attached");
      return;
    }
    setBusy(true);
    setTerminal((t) => t + `\n$ ${type === "test" ? "run" : type}\n`);
    const res = await fetch(`/api/workspace/${props.workspaceId}/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const json = await res.json();
    if (!json.ok) {
      setBusy(false);
      return toast.error(json.error?.message || "Execution failed");
    }
    setTerminal((t) => t + `queued job ${json.data.id} (${json.data.status})\n`);

    // Poll briefly for process-mode completion
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 700));
      router.refresh();
    }
    try {
      const jobsRes = await fetch(`/api/workspace/${props.workspaceId}/execute`, { method: "GET" }).catch(() => null);
      if (jobsRes) {
        const jobsJson = await jobsRes.json();
        if (jobsJson.ok && Array.isArray(jobsJson.data?.jobs)) {
          const latest = jobsJson.data.jobs.find((j: { type: string }) => j.type === type) ?? jobsJson.data.jobs[0];
          if (latest?.diagnostic) {
            setLastDiagnostic(latest.diagnostic);
            setTerminal(
              (t) =>
                t +
                `diagnostic: ${latest.diagnostic.category} — ${latest.diagnostic.summary}` +
                (latest.diagnostic.expected != null ? `\n  expected: ${latest.diagnostic.expected}` : "") +
                (latest.diagnostic.actual != null ? `\n  actual: ${latest.diagnostic.actual}` : "") +
                (latest.diagnostic.hint ? `\n  hint: ${latest.diagnostic.hint}` : "") +
                (latest.diagnostic.contestantFault === false ? `\n  (infrastructure — not counted as your failure)` : "") +
                `\n`,
            );
          }
          if (latest?.stdout) {
            const parsed = parseCases(latest.stdout);
            if (parsed.length) {
              setCaseResults(parsed);
              applyVerdict(parsed);
              void refreshPinpoint(parsed);
              setBusy(false);
              toast.message(type === "test" ? "Public tests finished — check Judge panel" : "Job finished");
              return;
            }
          }
        }
      }
    } catch {
      /* ignore */
    }
    setBusy(false);
    // Re-parse from latest job props after refresh cycles
    const job = props.jobs.find((j) => j.type === type) ?? props.jobs[0];
    if (job?.stdout) {
      const parsed = parseCases(job.stdout);
      if (parsed.length) {
        setCaseResults(parsed);
        applyVerdict(parsed);
        void refreshPinpoint(parsed);
      } else {
        void refreshPinpoint([]);
      }
    }
    toast.message(type === "test" ? "Public tests queued — check Judge panel" : "Job queued");
  }

  const latestTestJob = useMemo(() => {
    return props.jobs.find((j) => j.type === "test" || j.type === "hidden_test");
  }, [props.jobs]);

  useEffect(() => {
    if (latestTestJob?.stdout) {
      const parsed = parseCases(latestTestJob.stdout);
      if (parsed.length) {
        setCaseResults(parsed);
        applyVerdict(parsed);
      }
    }
  }, [latestTestJob?.id, latestTestJob?.stdout]);

  async function submit() {
    if (!judgeOnline) {
      toast.error("Judge offline — Docker worker not attached");
      return;
    }
    setBusy(true);
    setTerminal((t) => t + `\n$ submit\n`);
    setJudgeVerdict({
      label: "Pending",
      publicPassed: 0,
      publicTotal: 0,
      hiddenPassed: 0,
      hiddenTotal: 0,
    });
    try {
      // Run public then hidden so the judge panel can show both lanes
      const publicRes = await fetch(`/api/workspace/${props.workspaceId}/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "test" }),
      });
      const publicJson = await publicRes.json();
      if (coding) {
        await fetch(`/api/workspace/${props.workspaceId}/execute`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "hidden_test" }),
        });
      }
      const res = await fetch(`/api/assignments/${props.assignmentId}/submit`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error?.message || "Submit failed");
        return;
      }

      // Collect stdout from the most recent jobs after settle
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 500));
      }
      router.refresh();

      const merged: CaseResult[] = [];
      for (const job of props.jobs.slice(0, 6)) {
        const parsed = parseCases(job.stdout);
        for (const r of parsed) {
          if (!merged.find((m) => m.name === r.name && Boolean(m.hidden) === Boolean(r.hidden))) {
            merged.push(r);
          }
        }
      }
      // Prefer stdout from the just-queued public job if present in response
      if (publicJson?.ok && publicJson.data?.stdout) {
        for (const r of parseCases(publicJson.data.stdout)) {
          if (!merged.find((m) => m.name === r.name && Boolean(m.hidden) === Boolean(r.hidden))) {
            merged.push(r);
          }
        }
      }

      // Fetch fresh job list via page refresh data — also hit a lightweight poll on jobs already in props after refresh
      const detail = await fetch(`/api/workspace/${props.workspaceId}/files`).catch(() => null);
      void detail;

      if (merged.length) {
        setCaseResults(merged);
        applyVerdict(merged);
      } else {
        // Fallback verdict from score alone
        const overall = json.data.report?.overall;
        setJudgeVerdict({
          label: overall != null && overall >= 80 ? "Accepted" : "Pending",
          publicPassed: caseResults.filter((c) => !c.hidden && c.pass).length,
          publicTotal: caseResults.filter((c) => !c.hidden).length || caseResults.length,
          hiddenPassed: caseResults.filter((c) => c.hidden && c.pass).length,
          hiddenTotal: caseResults.filter((c) => c.hidden).length,
        });
      }

      const verdictLabel =
        merged.length === 0
          ? "Submitted"
          : merged.some((r) => !r.hidden && !r.pass)
            ? "Wrong Answer"
            : merged.some((r) => r.hidden && !r.pass)
              ? "Hidden failed"
              : "Accepted";
      toast.success(`${verdictLabel} · overall ${json.data.report?.overall ?? "—"}`);
      setTerminal(
        (t) =>
          t +
          `Submission graded. Judge=${verdictLabel} overall=${json.data.report?.overall}\n` +
          `Share scorecard: /scorecard/${props.assignmentId}\n`,
      );
      const diag = json.data.report?.diagnostics;
      if (diag) setPinpoint(diag);
      else void refreshPinpoint(merged);
    } finally {
      setBusy(false);
    }
  }

  async function debugAction(action: "start" | "step" | "continue" | "set_breakpoint" | "clear") {
    if (!premium) return toast.error("Debugger requires Premium");
    const res = await fetch(`/api/workspace/${props.workspaceId}/debug`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, line: bpLine }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Debugger error");
    setDebugState(json.data);
    setDebuggerOpen(true);
    if (json.data.breakpoint && editorRef.current?.editor) {
      editorRef.current.editor.revealLineInCenter(json.data.breakpoint);
    }
  }

  async function hostPair() {
    const res = await fetch("/api/pair", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: props.workspaceId, guestRole: "SHADOW" }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Pair failed");
    setPairCode(json.data.code);
    toast.success(`Pair code ${json.data.code} — share with interviewer/shadow`);
  }

  async function joinPair() {
    const res = await fetch("/api/pair", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: joinCode }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Join failed");
    toast.success(`Joined as ${json.data.guestRole || "SHADOW"}`);
    if (json.data.workspaceId) router.push(`/workspace/${json.data.workspaceId}`);
  }

  function wireAiComplete(editor: any, monaco: any) {
    if (!premium || !monaco) return;
    const provider = monaco.languages.registerCompletionItemProvider(
      guessLang(activePath, props.language),
      {
        triggerCharacters: [".", " ", "(", "\n"],
        provideCompletionItems: async (model: any, position: any) => {
          const offset = model.getOffsetAt(position);
          const value = model.getValue();
          const prefix = value.slice(Math.max(0, offset - 2000), offset);
          const suffix = value.slice(offset, offset + 500);
          try {
            const res = await fetch(`/api/workspace/${props.workspaceId}/complete`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                path: activePath,
                prefix,
                suffix,
                language: props.language,
              }),
            });
            const json = await res.json();
            if (!json.ok) return { suggestions: [] };
            return {
              suggestions: (json.data.suggestions as { label: string; insertText: string; detail: string }[]).map(
                (s, i) => ({
                  label: s.label,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: s.insertText,
                  detail: s.detail,
                  range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endColumn: position.column,
                  },
                  sortText: `0${i}`,
                }),
              ),
            };
          } catch {
            return { suggestions: [] };
          }
        },
      },
    );
    editor.onDidDispose(() => provider.dispose());
  }

  const problemText =
    props.problemDescription ||
    files.find((f) => f.path === "PROBLEM.md")?.content ||
    props.problemSummary ||
    "";

  if (coding) {
    return (
      <div className="animate-rise space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={props.track === "CYBERSECURITY" ? "violet" : "brand"}>{props.track}</Badge>
              {props.difficulty != null && (
                <span className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", diffClass(props.difficulty))}>
                  {difficultyLabel(props.difficulty)}
                </span>
              )}
              {premium && <Badge variant="amber">Lightning Judge</Badge>}
              {props.isPremiumContent && <Badge variant="amber">Premium</Badge>}
              <SessionTimer endsAt={props.dueAt} timedMinutes={props.timedMinutes} />
            </div>
            <h1 className="mt-2 break-words text-xl font-semibold sm:text-2xl">{props.title}</h1>
            <p className="text-sm text-slate-600">
              {props.problemSummary || "Implement the solution and pass public + hidden tests."}
              {(props.companies?.length ?? 0) > 0 ? ` · Asked at ${props.companies!.slice(0, 3).join(", ")}` : ""}
            </p>
            {!judgeOnline && (
              <p className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <span className="font-semibold">Judge offline.</span>{" "}
                {props.judgeDetail ?? "Attach a Docker worker and set JUDGE_ONLINE=true to enable Run / Submit."}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              disabled={busy || !judgeOnline}
              onClick={() => run("test")}
              title={judgeOnline ? undefined : "Judge offline"}
            >
              {premium ? "Run · priority" : "Run"}
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={busy || !judgeOnline}
              onClick={submit}
              title={judgeOnline ? undefined : "Judge offline"}
            >
              Submit
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              disabled={!premium}
              onClick={() => (premium ? debugAction("start") : toast.error("Debugger requires Premium"))}
              title={premium ? "Start debugger" : "Premium feature"}
            >
              Debugger
            </Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={commit}>
              Commit
            </Button>
            <Button className="w-full sm:w-auto" variant="outline" onClick={hostPair}>
              Pair / shadow
            </Button>
          </div>
        </div>
        {(pairCode || joinCode !== undefined) && (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white/75 p-3 text-sm">
            {pairCode && (
              <div className="font-mono text-orange-800">
                Host code: <span className="text-lg tracking-widest">{pairCode}</span>
              </div>
            )}
            <Input
              className="max-w-[160px]"
              placeholder="Join code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <Button size="sm" variant="secondary" onClick={joinPair}>
              Join session
            </Button>
            <span className="text-xs text-slate-500">Live pair / interviewer shadow on this workspace</span>
          </div>
        )}
        {debuggerOpen && premium && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                Interactive debugger · {debugState?.status ?? "idle"}
                {debugState?.caseHint ? ` · case ${debugState.caseHint}` : ""}
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="h-8 w-20 bg-white"
                  type="number"
                  min={1}
                  value={bpLine}
                  onChange={(e) => setBpLine(Number(e.target.value) || 1)}
                  title="Breakpoint line"
                />
                <Button size="sm" variant="secondary" onClick={() => debugAction("set_breakpoint")}>
                  Break
                </Button>
                <Button size="sm" variant="secondary" onClick={() => debugAction("step")}>
                  Step
                </Button>
                <Button size="sm" variant="secondary" onClick={() => debugAction("continue")}>
                  Continue
                </Button>
                <Button size="sm" variant="outline" onClick={() => debugAction("clear")}>
                  Stop
                </Button>
              </div>
            </div>
            {debugState?.tip && <p className="mt-2 text-xs text-amber-100/70">{debugState.tip}</p>}
            {debugState?.frames?.length ? (
              <ul className="mt-3 space-y-2 font-mono text-xs">
                {debugState.frames.map((f, i) => (
                  <li key={`${f.fn}-${i}`} className="rounded-md border border-amber-500/20 bg-black/20 px-3 py-2">
                    <div>
                      #{i} {f.fn} · {f.file}:{f.line}
                    </div>
                    <div className="mt-1 text-amber-100/70">
                      {Object.entries(f.locals || {})
                        .map(([k, v]) => `${k}=${v}`)
                        .join(" · ") || "locals pending"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {/* Mobile tabs */}
        <div className="flex gap-2 xl:hidden">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm",
              panel === "problem" ? "border-orange-400/50 bg-orange-500/10 text-orange-900" : "border-slate-300 text-slate-600",
            )}
            onClick={() => setPanel("problem")}
          >
            Problem
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm",
              panel === "code" ? "border-orange-400/50 bg-orange-500/10 text-orange-900" : "border-slate-300 text-slate-600",
            )}
            onClick={() => setPanel("code")}
          >
            Code
          </button>
        </div>

        <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.15fr)]">
          <aside
            className={cn(
              "max-h-[70vh] space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white/80 p-4",
              panel === "code" ? "hidden xl:block" : "block",
            )}
          >
            <div className="flex flex-wrap gap-1">
              {(props.tags ?? [])
                .filter((t) => !["coding", "easy", "medium", "hard"].includes(t))
                .map((t) => (
                  <span key={t} className="rounded border border-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                    {t}
                  </span>
                ))}
            </div>
            <div className="space-y-4">{renderProblemBody(problemText)}</div>
            {props.challengeSlug && (
              <PracticeAssist
                challengeSlug={props.challengeSlug}
                workspaceId={props.workspaceId}
                onCustomRun={() => {
                  setTerminal((t) => t + "\n$ custom cases queued\n");
                  for (let i = 0; i < 6; i++) {
                    window.setTimeout(() => router.refresh(), 700 * (i + 1));
                  }
                }}
              />
            )}
          </aside>

          <div className={cn("space-y-3", panel === "problem" ? "hidden xl:block" : "block")}>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-[#0d1117]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                <select
                  className="max-w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-700"
                  value={activePath}
                  onChange={(e) => setActivePath(e.target.value)}
                >
                  {files.map((f) => (
                    <option key={f.id} value={f.path}>
                      {f.path}
                    </option>
                  ))}
                </select>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{props.language}</span>
              </div>
              <div className="h-[42vh] min-h-[260px] sm:h-[48vh]">
                <Monaco
                  height="100%"
                  theme="vs-dark"
                  language={guessLang(activePath, props.language)}
                  value={active?.content ?? ""}
                  onChange={(v) => v !== undefined && save(v)}
                  onMount={(editor, monaco) => {
                    editorRef.current = { editor, monaco };
                    wireAiComplete(editor, monaco);
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
                      editor.getAction("editor.action.formatDocument")?.run();
                    });
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                      void run("test");
                    });
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
                      void submit();
                    });
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "IBM Plex Mono, ui-monospace, monospace",
                    automaticLayout: true,
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    formatOnPaste: true,
                    quickSuggestions: premium,
                    suggestOnTriggerCharacters: premium,
                    wordBasedSuggestions: premium ? "currentDocument" : "off",
                    glyphMargin: premium,
                  }}
                />
              </div>
              <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
                Shortcuts: Ctrl/⌘+Enter Run · Ctrl/⌘+Shift+Enter Submit · Ctrl/⌘+Shift+F Format
                {premium ? " · AI autocomplete on" : " · "}
                {!premium && (
                  <>
                    {" "}
                    <a className="text-amber-300 hover:underline" href="/pricing">
                      Upgrade for AI autocomplete + debugger
                    </a>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-slate-500">
                  Judge {premium ? "· Lightning queue" : ""}
                </div>
                <div className="font-mono text-xs text-slate-600">
                  {caseResults.length
                    ? `${caseResults.filter((c) => c.pass).length}/${caseResults.length} passed`
                    : latestTestJob
                      ? latestTestJob.status
                      : "not run"}
                </div>
              </div>
              {judgeVerdict && (
                <div
                  className={cn(
                    "mb-3 rounded-lg border px-3 py-2",
                    judgeVerdict.label === "Accepted"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                      : judgeVerdict.label === "Hidden failed"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-50"
                        : judgeVerdict.label === "Wrong Answer"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                          : "border-slate-300 bg-slate-100/80 text-slate-700",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{judgeVerdict.label}</span>
                    <span className="font-mono text-[11px] opacity-80">
                      public {judgeVerdict.publicPassed}/{judgeVerdict.publicTotal || "—"} · hidden{" "}
                      {judgeVerdict.hiddenPassed}/{judgeVerdict.hiddenTotal || "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] opacity-75">
                    Public examples vs hidden harness — Submit is only Accepted when both lanes pass.
                  </p>
                  {lastDiagnostic && (
                    <div className="mt-2 space-y-1 border-t border-white/10 pt-2 font-mono text-[11px]">
                      <div>
                        {lastDiagnostic.category}
                        {!lastDiagnostic.contestantFault ? " · infrastructure (not your fail)" : ""}
                      </div>
                      <div className="opacity-90">{lastDiagnostic.summary}</div>
                      {lastDiagnostic.expected != null && <div>expected: {lastDiagnostic.expected}</div>}
                      {lastDiagnostic.actual != null && <div>actual: {lastDiagnostic.actual}</div>}
                      {lastDiagnostic.hint && <div className="opacity-75">{lastDiagnostic.hint}</div>}
                    </div>
                  )}
                </div>
              )}
              {caseResults.length ? (
                <ul className="space-y-1.5">
                  {caseResults.map((c) => (
                    <li
                      key={`${c.hidden ? "h" : "p"}-${c.name}`}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 font-mono text-xs",
                        c.pass
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-800"
                          : "border-rose-500/20 bg-rose-500/5 text-rose-200",
                      )}
                    >
                      <span>
                        {c.hidden ? "hidden · " : "public · "}
                        {c.name}
                      </span>
                      <span>
                        {c.pass ? "Accepted" : c.hidden ? "Hidden failed" : "Wrong Answer"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Click Run for public examples, then Submit for the hidden harness.</p>
              )}
              <PinpointPanel pinpoint={pinpoint} />
              <Textarea className="mt-3 min-h-[80px] font-mono text-xs" value={terminal} readOnly />
            </section>
          </div>
        </div>
      </div>
    );
  }

  const briefFile = files.find((f) => f.path === "BRIEF.md")?.content;
  const checklistFile = files.find((f) => f.path === "CHECKLIST.md")?.content;

  return (
    <div className="animate-rise space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={props.track === "CYBERSECURITY" ? "violet" : "brand"}>{props.track}</Badge>
            <Badge>{props.language}</Badge>
            {props.difficulty != null && (
              <span className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", diffClass(props.difficulty))}>
                {difficultyLabel(props.difficulty)} · {props.difficulty}/10
              </span>
            )}
            {props.currentLevel != null && (
              <Badge variant="emerald">
                Level {props.currentLevel}
                {props.maxLevelReached && props.maxLevelReached > props.currentLevel
                  ? ` · peak ${props.maxLevelReached}`
                  : ""}
              </Badge>
            )}
            <SessionTimer endsAt={props.dueAt} timedMinutes={props.timedMinutes} />
          </div>
          <h1 className="mt-2 break-words text-xl font-semibold sm:text-2xl">{props.title}</h1>
          <p className="text-sm text-slate-600">
            {props.problemSummary || "Mission brief · sandboxed evidence · adaptive grading"}
            {props.timedMinutes ? ` · ${props.timedMinutes}-minute session` : ""}
          </p>
            {!judgeOnline && (
              <p className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <span className="font-semibold">Judge offline.</span>{" "}
                {props.judgeDetail ?? "Attach a Docker worker and set JUDGE_ONLINE=true to enable Run / Submit."}
              </p>
            )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            className="w-full sm:w-auto"
            variant="secondary"
            disabled={busy || !judgeOnline}
            title={judgeOnline ? undefined : "Judge offline"}
            onClick={() => run("test")}
          >
            Run tests
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="secondary"
            disabled={busy || !judgeOnline}
            title={judgeOnline ? undefined : "Judge offline"}
            onClick={() => run("hidden_test")}
          >
            Hidden tests
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="secondary"
            disabled={busy || !judgeOnline}
            title={judgeOnline ? undefined : "Judge offline"}
            onClick={() => run("deploy_check")}
          >
            Verify deploy
          </Button>
          <Button
            className="col-span-2 w-full sm:col-span-1 sm:w-auto"
            disabled={busy || !judgeOnline}
            title={judgeOnline ? undefined : "Judge offline"}
            onClick={submit}
          >
            Submit for evaluation
          </Button>
        </div>
      </div>

      {/* Progress strip */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Deliverables</div>
          <div className="mt-1 font-mono text-sm text-orange-800">
            {deliverableDone}/{publicReqs.length || "—"} checked
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-orange-500/80 transition-all"
              style={{
                width: `${publicReqs.length ? Math.round((deliverableDone / publicReqs.length) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Public tests</div>
          <div className="mt-1 font-mono text-sm text-slate-800">
            {caseResults.filter((c) => !c.hidden).length
              ? `${caseResults.filter((c) => !c.hidden && c.pass).length}/${caseResults.filter((c) => !c.hidden).length}`
              : "not run"}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Adaptive</div>
          <div className="mt-1 font-mono text-sm text-emerald-800">
            L{props.currentLevel ?? 1}
            {adaptive.length ? ` / ${adaptive.length}` : ""}
            {adaptive.find((l) => l.level === (props.currentLevel ?? 1))
              ? ` · ${adaptive.find((l) => l.level === (props.currentLevel ?? 1))!.title}`
              : ""}
          </div>
        </div>
      </div>

      <div className="flex gap-2 xl:hidden">
        {(
          [
            ["brief", "Mission"],
            ["code", "Workspace"],
            ["evidence", "Evidence"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm",
              projectPanel === id ? "border-orange-400/50 bg-orange-500/10 text-orange-900" : "border-slate-300 text-slate-600",
            )}
            onClick={() => setProjectPanel(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(300px,0.95fr)_minmax(0,1.2fr)_minmax(240px,0.75fr)]">
        {/* Mission brief */}
        <aside
          className={cn(
            "max-h-[75vh] space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white/80 p-4",
            projectPanel === "brief" ? "block" : "hidden xl:block",
          )}
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Mission brief</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {props.problemSummary || "Ship evidence against the public deliverables; hidden harnesses grade the rest."}
            </p>
          </div>

          {(props.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {props.tags!.map((t) => (
                <span key={t} className="rounded border border-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                  {t}
                </span>
              ))}
            </div>
          )}

          {(props.owaspMappings?.length || props.mitreMappings?.length) && (
            <div className="space-y-1 text-xs text-slate-600">
              {props.owaspMappings?.length ? (
                <div>
                  <span className="text-slate-500">OWASP · </span>
                  {props.owaspMappings.join(", ")}
                </div>
              ) : null}
              {props.mitreMappings?.length ? (
                <div>
                  <span className="text-slate-500">MITRE · </span>
                  {props.mitreMappings.join(", ")}
                </div>
              ) : null}
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-slate-500">Public deliverables</div>
              <button
                type="button"
                className="text-[11px] text-orange-700 hover:underline"
                onClick={() => {
                  setActivePath("CHECKLIST.md");
                  setProjectPanel("code");
                }}
              >
                Open CHECKLIST.md
              </button>
            </div>
            <ul className="space-y-2">
              {(publicReqs.length ? publicReqs : ["Working solution with tests"]).map((r) => (
                <li key={r}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1 accent-orange-400"
                      checked={!!checkedDeliverables[r]}
                      onChange={(e) => setCheckedDeliverables((prev) => ({ ...prev, [r]: e.target.checked }))}
                    />
                    <span>{r}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {hiddenReqs.length > 0 && (
            <div>
              <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Hidden evaluation bar</div>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {hiddenReqs.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-amber-400/80">●</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Object.keys(rubric).length > 0 && (
            <div>
              <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Rubric</div>
              <ul className="space-y-2">
                {Object.entries(rubric).map(([k, v]) => (
                  <li key={k} className="rounded-lg border border-slate-200 bg-black/20 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-orange-800/90">{k}</div>
                    <div className="mt-0.5 text-sm text-slate-600">{v}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {adaptive.length > 0 && (
            <div>
              <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Adaptive levels</div>
              <ol className="space-y-1.5">
                {adaptive.map((l) => {
                  const current = (props.currentLevel ?? 1) === l.level;
                  const cleared = (props.maxLevelReached ?? 1) > l.level || ((props.currentLevel ?? 1) > l.level);
                  return (
                    <li
                      key={l.level}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-xs",
                        current
                          ? "border-orange-400/50 bg-orange-500/10 text-orange-900"
                          : cleared
                            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-100/80"
                            : "border-slate-200 text-slate-500",
                      )}
                    >
                      <span className="font-mono">L{l.level}</span> {l.title}
                      <div className="mt-0.5 text-[11px] opacity-80">{l.criteria}</div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {(briefFile || checklistFile) && (
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setActivePath("BRIEF.md");
                  setProjectPanel("code");
                }}
              >
                BRIEF.md
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setActivePath("docs/ARCHITECTURE.md");
                  setProjectPanel("code");
                }}
              >
                Architecture
              </Button>
            </div>
          )}

          {props.problemDescription && (
            <div className="border-t border-slate-200 pt-3">
              <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Full brief</div>
              <div className="space-y-3 text-sm text-slate-600">{renderProblemBody(props.problemDescription)}</div>
            </div>
          )}
        </aside>

        {/* Editor + files */}
        <div className={cn("space-y-3", projectPanel === "code" ? "block" : "hidden xl:block")}>
          <div className="flex flex-wrap gap-2 xl:hidden">
            <select
              className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              value={activePath}
              onChange={(e) => setActivePath(e.target.value)}
            >
              {files.map((f) => (
                <option key={f.id} value={f.path}>
                  {f.path}
                </option>
              ))}
            </select>
          </div>
          <div className="grid min-h-0 gap-3 xl:grid-cols-[200px_1fr]">
            <aside className="hidden rounded-xl border border-slate-200 bg-white/80 p-3 xl:block">
              <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Files · {files.length}</div>
              <ul className="max-h-[58vh] space-y-1 overflow-auto">
                {files.map((f) => (
                  <li key={f.id}>
                    <button
                      className={`w-full rounded px-2 py-1.5 text-left font-mono text-xs ${
                        f.path === activePath ? "bg-orange-500/10 text-orange-800" : "text-slate-600 hover:bg-slate-100"
                      }`}
                      onClick={() => setActivePath(f.path)}
                    >
                      {f.path}
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
            <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-[#0d1117]">
              <div className="truncate border-b border-slate-200 px-3 py-2 font-mono text-xs text-slate-600">
                {activePath}
              </div>
              <div className="h-[42vh] min-h-[240px] sm:h-[52vh] lg:h-[58vh]">
                <Monaco
                  height="100%"
                  theme="vs-dark"
                  language={guessLang(activePath, props.language)}
                  value={active?.content ?? ""}
                  onChange={(v) => v !== undefined && save(v)}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "IBM Plex Mono, ui-monospace, monospace",
                    automaticLayout: true,
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </section>
          </div>
        </div>

        {/* Evidence / git / jobs */}
        <aside
          className={cn(
            "grid gap-3 sm:grid-cols-2 xl:grid-cols-1",
            projectPanel === "evidence" ? "block" : "hidden xl:grid",
          )}
        >
          {judgeVerdict && (
            <div
              className={cn(
                "rounded-xl border px-3 py-2 sm:col-span-2 xl:col-span-1",
                judgeVerdict.label === "Accepted"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : judgeVerdict.label === "Wrong Answer"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                    : "border-slate-300 bg-white/80 text-slate-700",
              )}
            >
              <div className="text-sm font-semibold">{judgeVerdict.label}</div>
              <div className="mt-1 font-mono text-[11px] opacity-80">
                public {judgeVerdict.publicPassed}/{judgeVerdict.publicTotal || "—"} · hidden{" "}
                {judgeVerdict.hiddenPassed}/{judgeVerdict.hiddenTotal || "—"}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 sm:col-span-2 xl:col-span-1">
            <PinpointPanel pinpoint={pinpoint} compact />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
            <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Git</div>
            <Input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} className="mb-2" />
            <Button size="sm" className="w-full min-h-10" onClick={commit}>
              Commit
            </Button>
            <ul className="mt-3 max-h-40 space-y-2 overflow-auto text-xs text-slate-600">
              {props.commits.map((c) => (
                <li key={c.sha} className="break-words font-mono">
                  <span className="text-orange-700">{c.sha.slice(0, 8)}</span> {c.message}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
            <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Jobs</div>
            <ul className="max-h-40 space-y-2 overflow-auto text-xs">
              {props.jobs.map((j) => (
                <li key={j.id} className="rounded border border-slate-200 p-2">
                  <div className="font-mono text-slate-700">
                    {j.type} · {j.status}
                  </div>
                  {(j.stdout || j.stderr) && (
                    <pre className="mt-1 max-h-16 overflow-auto whitespace-pre-wrap break-all text-[10px] text-slate-500">
                      {(j.stdout || j.stderr || "").slice(0, 400)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-black/40 p-3 sm:col-span-2 xl:col-span-1">
            <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Terminal</div>
            <Textarea className="min-h-[120px] font-mono text-xs sm:min-h-[160px]" value={terminal} readOnly />
          </div>
        </aside>
      </div>
    </div>
  );
}

function guessLang(path: string, fallback: string) {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".go")) return "go";
  if (path.endsWith(".rs")) return "rust";
  if (path.endsWith(".java")) return "java";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".yaml") || path.endsWith(".yml")) return "yaml";
  if (fallback === "python" || fallback === "go" || fallback === "rust" || fallback === "java" || fallback === "javascript") {
    return fallback;
  }
  return "typescript";
}

function PinpointPanel({ pinpoint, compact }: { pinpoint: Pinpoint | null; compact?: boolean }) {
  if (!pinpoint) {
    return (
      <div className={cn("mt-3 rounded-lg border border-slate-200 bg-black/30 p-3", compact && "mt-0")}>
        <div className="text-xs uppercase tracking-wider text-slate-500">Knowledge pinpoint</div>
        <p className="mt-1 text-sm text-slate-500">
          Run public + hidden tests to map exactly which skills this mission proves — and which gaps remain.
        </p>
      </div>
    );
  }
  return (
    <div className={cn("mt-3 space-y-2 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3", compact && "mt-0")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wider text-orange-700/80">Knowledge pinpoint</div>
        <span className="font-mono text-[11px] text-slate-600">
          {pinpoint.band} · D{pinpoint.difficulty}
        </span>
      </div>
      <p className="text-sm text-slate-800">{pinpoint.summary}</p>
      {pinpoint.knows.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-emerald-400/80">Knows</div>
          <ul className="mt-1 space-y-1">
            {pinpoint.knows.slice(0, compact ? 4 : 8).map((k) => (
              <li key={k.name} className="text-xs text-emerald-100/90">
                <span className="font-medium">{k.name}</span>
                <span className="text-slate-500"> · {k.domain}</span>
                {k.evidence[0] ? <span className="block font-mono text-[10px] text-slate-500">{k.evidence[0]}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      {pinpoint.gaps.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-amber-300/80">Gaps</div>
          <ul className="mt-1 space-y-1">
            {pinpoint.gaps.slice(0, compact ? 4 : 8).map((g) => (
              <li key={g.name} className="text-xs text-amber-50/90">
                <span className="font-medium">{g.name}</span>
                <span className="text-slate-500"> · {g.status}</span>
                {g.evidence[0] ? <span className="block font-mono text-[10px] text-slate-500">{g.evidence[0]}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      {pinpoint.nextFocus.length > 0 && (
        <div className="text-[11px] text-slate-600">
          Next: {pinpoint.nextFocus.slice(0, 3).join(" · ")}
        </div>
      )}
      <p className="text-[11px] text-slate-500">{pinpoint.ceiling.note}</p>
    </div>
  );
}
