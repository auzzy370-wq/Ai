import { prisma } from "@/lib/db";
import { difficultyBand, type DifficultyBand } from "@/lib/difficulty";
import { skillDomain, skillName, skillsFromTags, SKILL_TAXONOMY } from "./skill-taxonomy";

export type CaseResult = { name: string; pass: boolean; hidden?: boolean };

export type SkillProbe = {
  skillId: string;
  name: string;
  domain: string;
  status: "proven" | "partial" | "gap" | "untested";
  /** Highest difficulty where this skill was proven on a passing suite */
  provenAt: number | null;
  /** Highest difficulty where the skill was attempted */
  attemptedAt: number | null;
  publicPassed: number;
  publicFailed: number;
  hiddenPassed: number;
  hiddenFailed: number;
  evidence: string[];
};

export type KnowledgePinpoint = {
  generatedAt: string;
  challengeSlug: string;
  challengeTitle: string;
  difficulty: number;
  band: DifficultyBand;
  verdict: "Accepted" | "Wrong Answer" | "Hidden failed" | "Partial" | "Not run";
  summary: string;
  /** What this run proves they know */
  knows: SkillProbe[];
  /** What this run shows they do not yet demonstrate */
  gaps: SkillProbe[];
  /** Skills on the challenge not covered by case names / still inconclusive */
  inconclusive: SkillProbe[];
  ceiling: { band: DifficultyBand; difficulty: number; note: string };
  nextFocus: string[];
};

function inferSkillsFromCaseName(name: string): string[] {
  const tokens = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/);
  const found = new Set<string>();
  for (const t of tokens) {
    for (const s of skillsFromTags([t])) found.add(s);
  }
  // Heuristic keyword bridges
  const blob = name.toLowerCase();
  if (/tenant|org|isolation|idor/.test(blob)) found.add("tenancy");
  if (/auth|login|session|token|jwt|mfa/.test(blob)) found.add("authn");
  if (/rbac|role|permission|forbidden|acl/.test(blob)) found.add("authz");
  if (/idempot|duplicate|replay|intent/.test(blob)) found.add("idempotency");
  if (/race|concurrent|lock|atomic/.test(blob)) found.add("concurrency");
  if (/sql|xss|ssrf|csrf|inject|owasp|vuln/.test(blob)) found.add("appsec");
  if (/cache|ttl|stampede/.test(blob)) found.add("caching");
  if (/queue|job|retry|poison|dlq/.test(blob)) found.add("queues");
  if (/deploy|health|docker/.test(blob)) found.add("deploy");
  if (/test|regression|harness/.test(blob)) found.add("testing");
  if (/perf|latency|p95|budget|complex/.test(blob)) found.add("complexity");
  if (/graph|bfs|dfs|topo/.test(blob)) found.add("graphs");
  if (/tree|bst|serialize/.test(blob)) found.add("trees");
  if (/dp|knapsack|word.?break/.test(blob)) found.add("dp");
  if (/window|substr/.test(blob)) found.add("sliding-window");
  if (/heap|top.?k|frequent/.test(blob)) found.add("heap");
  if (/paren|stack|bracket/.test(blob)) found.add("stack");
  if (/two.?sum|hash/.test(blob)) found.add("hash-table");
  if (/array|nums|index/.test(blob)) found.add("arrays");
  if (/string|password|valid/.test(blob)) found.add("strings");
  if (/rate.?limit|bucket/.test(blob)) found.add("caching");
  if (/crypto|cipher|hash.?pw|aead/.test(blob)) found.add("crypto");
  if (/privacy|pii|consent|dsar/.test(blob)) found.add("privacy");
  if (/detect|sigma|alert|soc|ir/.test(blob)) found.add("detection");
  return [...found];
}

function verdictFromCases(cases: CaseResult[]): KnowledgePinpoint["verdict"] {
  if (!cases.length) return "Not run";
  const pub = cases.filter((c) => !c.hidden);
  const hid = cases.filter((c) => c.hidden);
  if (pub.some((c) => !c.pass)) return "Wrong Answer";
  if (hid.length && hid.some((c) => !c.pass)) return "Hidden failed";
  if (pub.length && pub.every((c) => c.pass) && (!hid.length || hid.every((c) => c.pass))) return "Accepted";
  if (pub.some((c) => c.pass) || hid.some((c) => c.pass)) return "Partial";
  return "Wrong Answer";
}

export function buildAssignmentPinpoint(params: {
  challengeSlug: string;
  challengeTitle: string;
  difficulty: number;
  tags: string[];
  cases: CaseResult[];
}): KnowledgePinpoint {
  const challengeSkills = skillsFromTags(params.tags);
  // Always include testing when any cases ran
  if (params.cases.length && !challengeSkills.includes("testing")) challengeSkills.push("testing");

  const bySkill = new Map<
    string,
    {
      publicPassed: number;
      publicFailed: number;
      hiddenPassed: number;
      hiddenFailed: number;
      evidence: string[];
    }
  >();

  const ensure = (id: string) => {
    if (!bySkill.has(id)) {
      bySkill.set(id, {
        publicPassed: 0,
        publicFailed: 0,
        hiddenPassed: 0,
        hiddenFailed: 0,
        evidence: [],
      });
    }
    return bySkill.get(id)!;
  };

  for (const id of challengeSkills) ensure(id);

  for (const c of params.cases) {
    const inferred = inferSkillsFromCaseName(c.name);
    const targets = inferred.length ? inferred : challengeSkills;
    for (const id of targets) {
      const row = ensure(id);
      const label = `${c.hidden ? "hidden" : "public"}:${c.name}`;
      if (c.pass) {
        if (c.hidden) row.hiddenPassed += 1;
        else row.publicPassed += 1;
        row.evidence.push(`✓ ${label}`);
      } else {
        if (c.hidden) row.hiddenFailed += 1;
        else row.publicFailed += 1;
        row.evidence.push(`✗ ${label}`);
      }
    }
  }

  const probes: SkillProbe[] = [...bySkill.entries()].map(([skillId, row]) => {
    const attempted = row.publicPassed + row.publicFailed + row.hiddenPassed + row.hiddenFailed;
    const passed = row.publicPassed + row.hiddenPassed;
    const failed = row.publicFailed + row.hiddenFailed;
    let status: SkillProbe["status"] = "untested";
    if (attempted === 0) status = "untested";
    else if (failed === 0 && passed > 0 && row.hiddenFailed === 0 && (row.hiddenPassed > 0 || row.publicFailed === 0)) {
      // Proven if all attempted cases for skill passed; prefer needing at least one pass
      status = row.hiddenPassed > 0 || (row.publicPassed > 0 && row.hiddenFailed === 0 && row.publicFailed === 0)
        ? "proven"
        : "partial";
      if (row.publicPassed > 0 && row.hiddenPassed === 0 && failed === 0) status = "partial"; // public only
      if (failed === 0 && passed > 0) {
        status = row.hiddenPassed > 0 || !params.cases.some((c) => c.hidden) ? "proven" : "partial";
      }
    } else if (passed > 0 && failed > 0) status = "partial";
    else if (failed > 0 && passed === 0) status = "gap";

    // Refine: if any fail → not fully proven
    if (failed > 0 && passed > 0) status = "partial";
    if (failed > 0 && passed === 0) status = "gap";
    if (failed === 0 && passed > 0) {
      const hadHidden = params.cases.some((c) => c.hidden);
      status = !hadHidden || row.hiddenPassed > 0 || row.hiddenFailed + row.hiddenPassed === 0 ? "proven" : "partial";
      if (hadHidden && row.hiddenPassed === 0 && row.hiddenFailed === 0 && row.publicPassed > 0) status = "partial";
    }

    return {
      skillId,
      name: skillName(skillId),
      domain: skillDomain(skillId),
      status,
      provenAt: status === "proven" ? params.difficulty : null,
      attemptedAt: attempted > 0 ? params.difficulty : null,
      publicPassed: row.publicPassed,
      publicFailed: row.publicFailed,
      hiddenPassed: row.hiddenPassed,
      hiddenFailed: row.hiddenFailed,
      evidence: row.evidence.slice(0, 8),
    };
  });

  const knows = probes.filter((p) => p.status === "proven").sort((a, b) => a.name.localeCompare(b.name));
  const gaps = probes.filter((p) => p.status === "gap" || p.status === "partial").sort((a, b) => a.name.localeCompare(b.name));
  const inconclusive = probes.filter((p) => p.status === "untested").sort((a, b) => a.name.localeCompare(b.name));
  const verdict = verdictFromCases(params.cases);
  const band = difficultyBand(params.difficulty);

  const summary =
    verdict === "Not run"
      ? "No tests run yet — skills remain unproven."
      : verdict === "Accepted"
        ? `Proven at ${band} (D${params.difficulty}): ${knows.map((k) => k.name).join(", ") || "core suite"}.`
        : `Pinpoint after ${verdict}: knows ${knows.length} skill(s); ${gaps.length} gap(s); ${inconclusive.length} untested on this mission.`;

  const nextFocus = [
    ...gaps.slice(0, 3).map((g) => `Close gap: ${g.name} (${g.evidence[0] ?? g.status})`),
    ...inconclusive.slice(0, 2).map((u) => `Probe next: ${u.name}`),
  ].slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    challengeSlug: params.challengeSlug,
    challengeTitle: params.challengeTitle,
    difficulty: params.difficulty,
    band,
    verdict,
    summary,
    knows,
    gaps,
    inconclusive,
    ceiling: {
      band,
      difficulty: params.difficulty,
      note:
        verdict === "Accepted"
          ? `Cleared ${band}. Ready to probe higher difficulty in: ${knows.map((k) => k.name).slice(0, 3).join(", ") || "same domain"}.`
          : `Ceiling not cleared at ${band}. Focus gaps before ascending.`,
    },
    nextFocus,
  };
}

export type CumulativeKnowledge = {
  updatedAt: string;
  skills: {
    skillId: string;
    name: string;
    domain: string;
    status: "proven" | "partial" | "gap" | "untested";
    maxProvenDifficulty: number;
    maxAttemptedDifficulty: number;
    passCount: number;
    failCount: number;
    lastEvidence: string;
  }[];
  knownDomains: string[];
  strongest: string[];
  weakest: string[];
  readiness: { band: DifficultyBand; note: string };
};

export function mergeCumulative(
  prev: CumulativeKnowledge | null | undefined,
  pinpoint: KnowledgePinpoint,
): CumulativeKnowledge {
  const map = new Map<string, CumulativeKnowledge["skills"][number]>();
  for (const s of prev?.skills ?? []) map.set(s.skillId, { ...s });

  const apply = (p: SkillProbe) => {
    const cur = map.get(p.skillId) ?? {
      skillId: p.skillId,
      name: p.name,
      domain: p.domain,
      status: "untested" as const,
      maxProvenDifficulty: 0,
      maxAttemptedDifficulty: 0,
      passCount: 0,
      failCount: 0,
      lastEvidence: "",
    };
    const passes = p.publicPassed + p.hiddenPassed;
    const fails = p.publicFailed + p.hiddenFailed;
    cur.passCount += passes;
    cur.failCount += fails;
    if (p.attemptedAt != null) cur.maxAttemptedDifficulty = Math.max(cur.maxAttemptedDifficulty, p.attemptedAt);
    if (p.status === "proven" && p.provenAt != null) {
      cur.maxProvenDifficulty = Math.max(cur.maxProvenDifficulty, p.provenAt);
      cur.status = "proven";
    } else if (p.status === "partial" && cur.status !== "proven") {
      cur.status = "partial";
    } else if (p.status === "gap" && cur.status === "untested") {
      cur.status = "gap";
    } else if (p.status === "gap" && cur.status === "partial") {
      cur.status = "partial";
    }
    if (fails > 0 && cur.status === "proven" && (p.provenAt ?? 0) >= cur.maxProvenDifficulty) {
      // Failed at same/higher tier — demote to partial until re-proven
      if (p.status !== "proven") cur.status = "partial";
    }
    cur.lastEvidence = p.evidence[0] ?? cur.lastEvidence;
    map.set(p.skillId, cur);
  };

  for (const p of [...pinpoint.knows, ...pinpoint.gaps, ...pinpoint.inconclusive]) apply(p);

  const skills = [...map.values()].sort((a, b) => b.maxProvenDifficulty - a.maxProvenDifficulty || a.name.localeCompare(b.name));
  const proven = skills.filter((s) => s.status === "proven");
  const weak = skills.filter((s) => s.status === "gap" || s.status === "partial");
  const maxProven = proven.reduce((m, s) => Math.max(m, s.maxProvenDifficulty), 0);
  const band = difficultyBand(Math.max(1, maxProven || 1));

  return {
    updatedAt: new Date().toISOString(),
    skills,
    knownDomains: [...new Set(proven.map((s) => s.domain))],
    strongest: proven.slice(0, 8).map((s) => `${s.name} (D${s.maxProvenDifficulty})`),
    weakest: weak.slice(0, 8).map((s) => `${s.name} (${s.status})`),
    readiness: {
      band: maxProven >= 9 ? "Expert" : maxProven >= 7 ? "Hard" : maxProven >= 4 ? "Medium" : maxProven >= 1 ? "Easy" : band,
      note:
        maxProven === 0
          ? "No skills proven yet — run public + hidden tests on any mission."
          : `Highest proven difficulty D${maxProven} (${difficultyBand(maxProven)}). ${weak.length} skill(s) still partial/gap.`,
    },
  };
}

export async function persistPinpoint(params: {
  assignmentId: string;
  candidateId: string;
  pinpoint: KnowledgePinpoint;
}) {
  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { id: params.assignmentId },
    include: { scoreReport: true },
  });
  if (!assignment) return null;

  const report = await prisma.scoreReport.upsert({
    where: { assignmentId: params.assignmentId },
    create: {
      assignmentId: params.assignmentId,
      overall: 0,
      frontend: 0,
      backend: 0,
      database: 0,
      architecture: 0,
      infrastructure: 0,
      security: 0,
      testing: 0,
      problemSolving: 0,
      performance: 0,
      collaboration: 0,
      diagnostics: params.pinpoint as object,
    },
    update: {
      diagnostics: params.pinpoint as object,
    },
  });

  const profile = await prisma.candidateProfile.findUnique({ where: { userId: params.candidateId } });
  if (profile) {
    const prev = (profile.knowledgeMap as CumulativeKnowledge | null) ?? null;
    const next = mergeCumulative(prev, params.pinpoint);
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { knowledgeMap: next as object },
    });

    // Promote proven skills into ASSESSMENT lane with confidence by difficulty
    for (const skill of params.pinpoint.knows) {
      const confidence = Math.min(0.95, 0.45 + (params.pinpoint.difficulty / 10) * 0.5);
      await prisma.skillRecord.upsert({
        where: {
          profileId_name_source: {
            profileId: profile.id,
            name: skill.name,
            source: "ASSESSMENT",
          },
        },
        create: {
          profileId: profile.id,
          name: skill.name,
          domain: skill.domain,
          source: "ASSESSMENT",
          confidence,
          evidence: `${params.pinpoint.challengeSlug} · ${skill.evidence[0] ?? "proven"} · D${params.pinpoint.difficulty}`,
        },
        update: {
          confidence: Math.max(confidence, 0.45),
          domain: skill.domain,
          evidence: `${params.pinpoint.challengeSlug} · ${skill.evidence[0] ?? "proven"} · D${params.pinpoint.difficulty}`,
        },
      });
    }
  }

  return report;
}

/** Ensure taxonomy skills appear as untested rows when building empty maps. */
export function emptyKnowledgeSkeleton(): CumulativeKnowledge {
  return {
    updatedAt: new Date().toISOString(),
    skills: SKILL_TAXONOMY.map((s) => ({
      skillId: s.id,
      name: s.name,
      domain: s.domain,
      status: "untested" as const,
      maxProvenDifficulty: 0,
      maxAttemptedDifficulty: 0,
      passCount: 0,
      failCount: 0,
      lastEvidence: "",
    })),
    knownDomains: [],
    strongest: [],
    weakest: [],
    readiness: { band: "Easy", note: "No assessments scored yet." },
  };
}
