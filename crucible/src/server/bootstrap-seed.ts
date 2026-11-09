import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { CHALLENGE_CATALOG, SEED_WORKSPACE_CATALOG, isExpandedLibrarySlug } from "@/server/challenges/catalog";
import {
  DEFAULT_WEIGHTS,
  CYBERSECURITY_WEIGHTS,
  SECURE_FULL_STACK_WEIGHTS,
  PLATFORM_SRE_WEIGHTS,
  DATA_ML_WEIGHTS,
  MOBILE_WEIGHTS,
  PRIVACY_WEIGHTS,
} from "@/server/scoring/policy";
import { createWorkspaceForAssignment, refreshWorkspaceStarters } from "@/server/execution/workspace";
import { createTeam } from "@/server/teams/service";

export async function seedDatabase(opts?: { includeDemoAccounts?: boolean }) {
  console.log("Seeding CRUCIBLE…");

  const includeDemo =
    opts?.includeDemoAccounts === true ||
    (opts?.includeDemoAccounts !== false && process.env.ALLOW_DEMO_ACCOUNTS === "true");
  const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD;
  const demoCandidatePassword = process.env.DEMO_CANDIDATE_PASSWORD;
  const canCreateDemos = includeDemo && Boolean(demoAdminPassword && demoCandidatePassword);

  // Never ship fixed passwords. Demo accounts only when env passwords are provided.
  // Cost 8 — bcryptjs at 12 often exceeds Vercel serverless login budgets.
  const passwordHash = canCreateDemos
    ? await bcrypt.hash(demoAdminPassword!, 8)
    : await bcrypt.hash(randomBytes(32).toString("hex"), 8);
  const candidateHash = canCreateDemos
    ? await bcrypt.hash(demoCandidatePassword!, 8)
    : await bcrypt.hash(randomBytes(32).toString("hex"), 8);
  const staffPasswordUpdate = canCreateDemos ? { passwordHash, emailVerifiedAt: new Date() } : { emailVerifiedAt: new Date() };
  const candidatePasswordUpdate = canCreateDemos ? { passwordHash: candidateHash, plan: "FREE" as const, emailVerifiedAt: new Date() } : { emailVerifiedAt: new Date() };

  const adminEmail = canCreateDemos ? "admin@crucible.local" : "system@crucible.internal";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: staffPasswordUpdate,
    create: {
      email: adminEmail,
      name: canCreateDemos ? "Super Admin" : "System",
      role: "SUPER_ADMIN",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const hiring = await prisma.user.upsert({
    where: { email: "hiring@crucible.local" },
    update: staffPasswordUpdate,
    create: {
      email: "hiring@crucible.local",
      name: "Harper Manager",
      role: "HIRING_MANAGER",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@crucible.local" },
    update: staffPasswordUpdate,
    create: {
      email: "reviewer@crucible.local",
      name: "Riley Reviewer",
      role: "TECHNICAL_REVIEWER",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const candidate = await prisma.user.upsert({
    where: { email: "candidate@crucible.local" },
    update: candidatePasswordUpdate,
    create: {
      email: "candidate@crucible.local",
      name: "Casey Candidate",
      role: "CANDIDATE",
      plan: "FREE",
      passwordHash: candidateHash,
      emailVerifiedAt: new Date(),
      githubLogin: "casey-candidate",
      candidateProfile: {
        create: {
          headline: "Full-stack engineer exploring elite qualification",
          bio: "Built multi-tenant SaaS and hardened APIs. Claims require assessment verification.",
          portfolioUrl: "https://example.com/casey",
          githubUrl: "https://github.com/example/casey",
          yearsExperience: 6,
          languages: ["typescript", "python", "go"],
          frameworks: ["nextjs", "fastapi"],
          databases: ["postgresql", "redis"],
          cloud: ["aws"],
          infrastructure: ["docker", "kubernetes"],
          aiExperience: ["openai-api"],
          cybersecurity: ["appsec", "owasp"],
          preferredTrack: "SECURE_FULL_STACK",
          previousEmployers: [{ company: "Example Corp", title: "Senior Engineer", years: 3 }],
        },
      },
    },
    include: { candidateProfile: true },
  });

  const premiumCandidate = await prisma.user.upsert({
    where: { email: "premium@crucible.local" },
    update: canCreateDemos
      ? {
          passwordHash: candidateHash,
          plan: "PREMIUM",
          planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        }
      : {},
    create: {
      email: "premium@crucible.local",
      name: "Parker Premium",
      role: "CANDIDATE",
      plan: "PREMIUM",
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      passwordHash: candidateHash,
      emailVerifiedAt: new Date(),
      candidateProfile: {
        create: {
          headline: "Premium Crucible member",
          preferredTrack: "SOFTWARE_ENGINEERING",
          yearsExperience: 4,
          languages: ["typescript", "python"],
        },
      },
    },
  });

  const cyberCandidate = await prisma.user.upsert({
    where: { email: "cyber@crucible.local" },
    update: canCreateDemos ? { passwordHash: candidateHash } : {},
    create: {
      email: "cyber@crucible.local",
      name: "Sam Security",
      role: "CANDIDATE",
      passwordHash: candidateHash,
      emailVerifiedAt: new Date(),
      candidateProfile: {
        create: {
          headline: "Application security & detection engineering",
          preferredTrack: "CYBERSECURITY",
          cybersecurity: ["appsec", "detection-engineering", "incident-response", "iam"],
          languages: ["python", "go", "typescript"],
          cloud: ["aws", "gcp"],
          infrastructure: ["terraform", "kubernetes"],
          yearsExperience: 5,
        },
      },
    },
  });

  const teammate = await prisma.user.upsert({
    where: { email: "teammate@crucible.local" },
    update: canCreateDemos ? { passwordHash: candidateHash } : {},
    create: {
      email: "teammate@crucible.local",
      name: "Taylor Teammate",
      role: "TEAM_MEMBER",
      passwordHash: candidateHash,
      emailVerifiedAt: new Date(),
      candidateProfile: { create: { headline: "Collaborative engineer", preferredTrack: "SOFTWARE_ENGINEERING" } },
    },
  });

  if (candidate.candidateProfile) {
    await prisma.skillRecord.upsert({
      where: {
        profileId_name_source: {
          profileId: candidate.candidateProfile.id,
          name: "typescript",
          source: "CLAIMED",
        },
      },
      create: {
        profileId: candidate.candidateProfile.id,
        name: "typescript",
        domain: "languages",
        source: "CLAIMED",
        confidence: 0.3,
        evidence: "Self-reported / résumé claim — not verified",
      },
      update: {},
    });
  }

  const engPolicy = await prisma.scoringPolicy.upsert({
    where: { id: "policy-eng-elite" },
    update: { weights: DEFAULT_WEIGHTS },
    create: {
      id: "policy-eng-elite",
      name: "Software Engineering Elite Policy",
      weights: DEFAULT_WEIGHTS,
      minOverall: 90,
      minCategoryPct: 80,
    },
  });

  const cyberPolicy = await prisma.scoringPolicy.upsert({
    where: { id: "policy-cyber-elite" },
    update: { weights: CYBERSECURITY_WEIGHTS },
    create: {
      id: "policy-cyber-elite",
      name: "Cybersecurity Elite Policy",
      weights: CYBERSECURITY_WEIGHTS,
      requireTeam: false,
      minOverall: 90,
      minCategoryPct: 80,
    },
  });

  const securePolicy = await prisma.scoringPolicy.upsert({
    where: { id: "policy-secure-elite" },
    update: { weights: SECURE_FULL_STACK_WEIGHTS },
    create: {
      id: "policy-secure-elite",
      name: "Secure Full-Stack Elite Policy",
      weights: SECURE_FULL_STACK_WEIGHTS,
      minOverall: 90,
      minCategoryPct: 80,
    },
  });

  const srePolicy = await prisma.scoringPolicy.upsert({
    where: { id: "policy-sre-elite" },
    update: { weights: PLATFORM_SRE_WEIGHTS },
    create: {
      id: "policy-sre-elite",
      name: "Platform / SRE Elite Policy",
      weights: PLATFORM_SRE_WEIGHTS,
      minOverall: 90,
      minCategoryPct: 80,
    },
  });

  const dataPolicy = await prisma.scoringPolicy.upsert({
    where: { id: "policy-data-elite" },
    update: { weights: DATA_ML_WEIGHTS },
    create: {
      id: "policy-data-elite",
      name: "Data / ML Elite Policy",
      weights: DATA_ML_WEIGHTS,
      minOverall: 90,
      minCategoryPct: 80,
    },
  });

  const mobilePolicy = await prisma.scoringPolicy.upsert({
    where: { id: "policy-mobile-elite" },
    update: { weights: MOBILE_WEIGHTS },
    create: {
      id: "policy-mobile-elite",
      name: "Mobile Engineering Elite Policy",
      weights: MOBILE_WEIGHTS,
      minOverall: 90,
      minCategoryPct: 80,
    },
  });

  const privacyPolicy = await prisma.scoringPolicy.upsert({
    where: { id: "policy-privacy-elite" },
    update: { weights: PRIVACY_WEIGHTS },
    create: {
      id: "policy-privacy-elite",
      name: "Privacy Engineering Elite Policy",
      weights: PRIVACY_WEIGHTS,
      minOverall: 90,
      minCategoryPct: 80,
    },
  });

  // Upsert hand-authored base; batch-insert the large expanded bank (thousands)
  const existingSlugs = new Set(
    (await prisma.challenge.findMany({ select: { slug: true } })).map((r) => r.slug),
  );
  const toCreate = CHALLENGE_CATALOG.filter((c) => !existingSlugs.has(c.slug));
  const toRefresh = CHALLENGE_CATALOG.filter((c) => existingSlugs.has(c.slug) && !c.slug.startsWith("q-") && !c.slug.startsWith("exp-"));

  for (const c of toRefresh) {
    await prisma.challenge.update({
      where: { slug: c.slug },
      data: {
        title: c.title,
        summary: c.summary,
        description: c.description,
        type: c.type,
        track: c.track,
        difficulty: c.difficulty,
        estimatedDays: c.estimatedDays,
        tags: c.tags,
        languages: c.languages,
        companies: c.companies ?? [],
        frequency: c.frequency ?? 0,
        avgMinutes: c.avgMinutes ?? (c.type === "CODING_PROBLEM" ? 30 : 60),
        isPremium: c.isPremium ?? false,
        publicRequirements: c.publicRequirements,
        hiddenRequirements: c.hiddenRequirements,
        adaptiveTrack: c.adaptiveTrack,
        gradingRubric: c.gradingRubric,
        mitreMappings: c.mitreMappings ?? [],
        owaspMappings: c.owaspMappings ?? [],
        controlledVulns: c.controlledVulns ?? undefined,
        isPublished: true,
      },
    });
  }

  const chunk = 200;
  for (let i = 0; i < toCreate.length; i += chunk) {
    const slice = toCreate.slice(i, i + chunk);
    await prisma.challenge.createMany({
      data: slice.map((c) => ({
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        description: c.description,
        type: c.type,
        track: c.track,
        difficulty: c.difficulty,
        estimatedDays: c.estimatedDays,
        tags: c.tags,
        languages: c.languages,
        companies: c.companies ?? [],
        frequency: c.frequency ?? 0,
        avgMinutes: c.avgMinutes ?? (c.type === "CODING_PROBLEM" ? 30 : 60),
        isPremium: c.isPremium ?? false,
        publicRequirements: c.publicRequirements,
        hiddenRequirements: c.hiddenRequirements,
        adaptiveTrack: c.adaptiveTrack,
        gradingRubric: c.gradingRubric,
        mitreMappings: c.mitreMappings ?? [],
        owaspMappings: c.owaspMappings ?? [],
        controlledVulns: c.controlledVulns ?? undefined,
        isPublished: true,
      })),
      skipDuplicates: true,
    });
    if (i === 0 || (i / chunk) % 5 === 0) {
      console.log(`Challenges inserted ${Math.min(i + chunk, toCreate.length)}/${toCreate.length}`);
    }
  }

  const saas = await prisma.challenge.findUniqueOrThrow({ where: { slug: "saas-nexus" } });
  const appsec = await prisma.challenge.findUniqueOrThrow({ where: { slug: "appsec-fortress" } });
  const soc = await prisma.challenge.findUniqueOrThrow({ where: { slug: "soc-nightwatch" } });
  const teamChallenge = await prisma.challenge.findUniqueOrThrow({ where: { slug: "team-forge" } });

  const DEFAULT_TIMED_MINUTES = 60;

  const assessmentSaas = await prisma.assessment.upsert({
    where: { id: "assess-saas-1" },
    update: { timedMinutes: DEFAULT_TIMED_MINUTES, status: "PUBLISHED" },
    create: {
      id: "assess-saas-1",
      title: "Elite SaaS Build — Nexus",
      description: "Individual full-stack SaaS assessment with adaptive difficulty. Timed 60-minute session.",
      challengeId: saas.id,
      track: "SOFTWARE_ENGINEERING",
      status: "PUBLISHED",
      timedMinutes: DEFAULT_TIMED_MINUTES,
      multiDay: false,
      progressiveDiff: true,
      createdById: hiring.id,
      scoringPolicyId: engPolicy.id,
    },
  });

  const assessmentCyber = await prisma.assessment.upsert({
    where: { id: "assess-cyber-1" },
    update: { timedMinutes: DEFAULT_TIMED_MINUTES, status: "PUBLISHED" },
    create: {
      id: "assess-cyber-1",
      title: "AppSec Fortress Qualification",
      description: "Cybersecurity track — controlled vulnerability lab with fix + regression requirements. Timed 60 minutes.",
      challengeId: appsec.id,
      track: "CYBERSECURITY",
      status: "PUBLISHED",
      timedMinutes: DEFAULT_TIMED_MINUTES,
      multiDay: false,
      progressiveDiff: true,
      allowTeam: false,
      createdById: hiring.id,
      scoringPolicyId: cyberPolicy.id,
    },
  });

  await prisma.assessment.upsert({
    where: { id: "assess-soc-1" },
    update: { timedMinutes: DEFAULT_TIMED_MINUTES, status: "PUBLISHED" },
    create: {
      id: "assess-soc-1",
      title: "SOC Nightwatch IR Simulation",
      description: "Incident response and detection engineering simulation. Timed 60-minute IR window.",
      challengeId: soc.id,
      track: "CYBERSECURITY",
      status: "PUBLISHED",
      timedMinutes: DEFAULT_TIMED_MINUTES,
      multiDay: false,
      createdById: hiring.id,
      scoringPolicyId: cyberPolicy.id,
    },
  });

  const assessmentTeam = await prisma.assessment.upsert({
    where: { id: "assess-team-1" },
    update: { timedMinutes: DEFAULT_TIMED_MINUTES, status: "PUBLISHED" },
    create: {
      id: "assess-team-1",
      title: "Team Forge Collaborative Delivery",
      description: "2–4 engineers, shared ownership, integration quality. Timed collaborative session.",
      challengeId: teamChallenge.id,
      track: "SECURE_FULL_STACK",
      status: "PUBLISHED",
      timedMinutes: DEFAULT_TIMED_MINUTES,
      multiDay: false,
      allowTeam: true,
      teamSizeMin: 2,
      teamSizeMax: 4,
      createdById: hiring.id,
      scoringPolicyId: securePolicy.id,
    },
  });

  await prisma.incidentScenario.upsert({
    where: { slug: "checkout-dup-payments" },
    update: {},
    create: {
      slug: "checkout-dup-payments",
      title: "Duplicate checkout charges under queue retry",
      synopsis: "Customers report double charges after payment provider timeouts.",
      symptoms: ["elevated 500s", "queue retries", "webhook storms"],
      rootCause: "Non-idempotent payment intent creation combined with at-least-once queue delivery.",
      buggyFiles: [{ path: "src/payments/charge.ts", issue: "missing idempotency key" }],
    },
  });

  await prisma.incidentScenario.upsert({
    where: { slug: "token-exfil-beacon" },
    update: {},
    create: {
      slug: "token-exfil-beacon",
      title: "Service token exfiltration + DNS beacon",
      synopsis: "SOC alerts show billing service token used from unfamiliar ASN with DNS spikes.",
      symptoms: ["impossible travel", "dns volume", "new ASN token use"],
      rootCause: "Compromised CI secret written to debug logs and harvested by attacker.",
      buggyFiles: [{ path: "ci/deploy.sh", issue: "echo of secret env" }],
      challengeId: soc.id,
    },
  });

  await prisma.aiProviderConfig.upsert({
    where: { id: "ai-default" },
    update: {},
    create: {
      id: "ai-default",
      name: "OpenAI-compatible default",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      apiKeyEnv: "OPENAI_API_KEY",
      isDefault: true,
      enabled: true,
    },
  });

  await prisma.platformSetting.upsert({
    where: { key: "retention_days" },
    update: { value: { candidateDataDays: 365, auditDays: 2555 } },
    create: { key: "retention_days", value: { candidateDataDays: 365, auditDays: 2555 } },
  });

  // —— Ready-to-use assignments + workspaces (tests already placed in starters) ——
  // IDs are platform-generated (cuid) — never guessable fixed strings.
  async function ensureAssignment(params: {
    assessmentId: string;
    candidateId: string;
    challengeSlug: string;
    track: string;
    language?: string;
  }) {
    const existing = await prisma.assessmentAssignment.findUnique({
      where: {
        assessmentId_candidateId: {
          assessmentId: params.assessmentId,
          candidateId: params.candidateId,
        },
      },
    });
    if (existing) {
      const startedAt = existing.startedAt ?? new Date();
      const refreshed = await prisma.assessmentAssignment.update({
        where: { id: existing.id },
        data: {
          startedAt,
          dueAt: new Date(startedAt.getTime() + DEFAULT_TIMED_MINUTES * 60 * 1000),
        },
      });
      const ws = await prisma.workspace.findUnique({ where: { assignmentId: existing.id } });
      if (!ws) {
        await createWorkspaceForAssignment({
          assignmentId: existing.id,
          challengeSlug: params.challengeSlug,
          language: params.language ?? "typescript",
          track: params.track,
        });
      } else {
        await refreshWorkspaceStarters({
          workspaceId: ws.id,
          challengeSlug: params.challengeSlug,
          language: params.language ?? ws.language ?? "typescript",
          track: params.track,
          force: true,
        });
      }
      return refreshed;
    }
    const startedAt = new Date();
    const assignment = await prisma.assessmentAssignment.create({
      data: {
        assessmentId: params.assessmentId,
        candidateId: params.candidateId,
        assignedById: hiring.id,
        status: "IN_PROGRESS",
        startedAt,
        dueAt: new Date(startedAt.getTime() + DEFAULT_TIMED_MINUTES * 60 * 1000),
        currentLevel: 1,
        maxLevelReached: 1,
      },
    });
    await createWorkspaceForAssignment({
      assignmentId: assignment.id,
      challengeSlug: params.challengeSlug,
      language: params.language ?? "typescript",
      track: params.track,
    });
    return assignment;
  }

  const assignSaas = await ensureAssignment({
    assessmentId: assessmentSaas.id,
    candidateId: candidate.id,
    challengeSlug: "saas-nexus",
    track: "SOFTWARE_ENGINEERING",
  });

  const assignCyber = await ensureAssignment({
    assessmentId: assessmentCyber.id,
    candidateId: cyberCandidate.id,
    challengeSlug: "appsec-fortress",
    track: "CYBERSECURITY",
  });

  const assignSoc = await ensureAssignment({
    assessmentId: "assess-soc-1",
    candidateId: cyberCandidate.id,
    challengeSlug: "soc-nightwatch",
    track: "CYBERSECURITY",
  });

  const assignTeamCasey = await ensureAssignment({
    assessmentId: assessmentTeam.id,
    candidateId: candidate.id,
    challengeSlug: "team-forge",
    track: "SECURE_FULL_STACK",
  });

  await ensureAssignment({
    assessmentId: assessmentTeam.id,
    candidateId: teammate.id,
    challengeSlug: "team-forge",
    track: "SECURE_FULL_STACK",
  });

  // Featured assessment IDs for challenges that already have named assessments
  const featuredBySlug: Record<string, string> = {
    "saas-nexus": assessmentSaas.id,
    "appsec-fortress": assessmentCyber.id,
    "soc-nightwatch": "assess-soc-1",
    "team-forge": assessmentTeam.id,
  };

  // Publish assessments — refresh featured; batch-create library assessments for new challenges
  const policyFor = (track: string) =>
    track === "CYBERSECURITY"
      ? cyberPolicy.id
      : track === "SECURE_FULL_STACK"
        ? securePolicy.id
        : track === "PLATFORM_SRE"
          ? srePolicy.id
          : track === "DATA_ML"
            ? dataPolicy.id
            : track === "MOBILE"
              ? mobilePolicy.id
              : track === "PRIVACY_ENGINEERING"
                ? privacyPolicy.id
                : engPolicy.id;

  for (const slug of Object.keys(featuredBySlug)) {
    const c = CHALLENGE_CATALOG.find((x) => x.slug === slug);
    if (!c) continue;
    const challenge = await prisma.challenge.findUnique({ where: { slug } });
    if (!challenge) continue;
    await prisma.assessment.upsert({
      where: { id: featuredBySlug[slug]! },
      update: { status: "PUBLISHED", scoringPolicyId: policyFor(c.track), timedMinutes: DEFAULT_TIMED_MINUTES },
      create: {
        id: featuredBySlug[slug]!,
        title:
          slug === "saas-nexus"
            ? "Elite SaaS Build — Nexus"
            : slug === "appsec-fortress"
              ? "AppSec Fortress Qualification"
              : slug === "soc-nightwatch"
                ? "SOC Nightwatch IR Simulation"
                : "Team Forge Collaborative Delivery",
        description: c.summary,
        challengeId: challenge.id,
        track: c.track,
        status: "PUBLISHED",
        timedMinutes: DEFAULT_TIMED_MINUTES,
        multiDay: false,
        progressiveDiff: true,
        createdById: hiring.id,
        scoringPolicyId: policyFor(c.track),
      },
    });
  }

  const challengeRows = await prisma.challenge.findMany({ select: { id: true, slug: true } });
  const challengeIdBySlug = new Map(challengeRows.map((r) => [r.slug, r.id]));
  const existingAssessIds = new Set(
    (await prisma.assessment.findMany({ select: { id: true } })).map((a) => a.id),
  );
  const assessCreates: {
    id: string;
    title: string;
    description: string;
    challengeId: string;
    track: (typeof CHALLENGE_CATALOG)[number]["track"];
    status: "PUBLISHED";
    timedMinutes: number;
    multiDay: boolean;
    progressiveDiff: boolean;
    allowTeam: boolean;
    teamSizeMin: number | null;
    teamSizeMax: number | null;
    createdById: string;
    scoringPolicyId: string;
  }[] = [];
  for (const c of CHALLENGE_CATALOG) {
    if (featuredBySlug[c.slug]) continue;
    const assessId = `assess-lib-${c.slug}`;
    if (existingAssessIds.has(assessId)) continue;
    const challengeId = challengeIdBySlug.get(c.slug);
    if (!challengeId) continue;
    assessCreates.push({
      id: assessId,
      title: c.title,
      description: `${c.summary} Timed ${DEFAULT_TIMED_MINUTES}-minute Crucible session.`,
      challengeId,
      track: c.track,
      status: "PUBLISHED",
      timedMinutes: DEFAULT_TIMED_MINUTES,
      multiDay: false,
      progressiveDiff: true,
      allowTeam: c.type === "TEAM_PROJECT",
      teamSizeMin: c.type === "TEAM_PROJECT" ? 2 : null,
      teamSizeMax: c.type === "TEAM_PROJECT" ? 4 : null,
      createdById: hiring.id,
      scoringPolicyId: policyFor(c.track),
    });
  }
  for (let i = 0; i < assessCreates.length; i += chunk) {
    await prisma.assessment.createMany({
      data: assessCreates.slice(i, i + chunk),
      skipDuplicates: true,
    });
    if (i === 0 || (i / chunk) % 5 === 0) {
      console.log(`Assessments inserted ${Math.min(i + chunk, assessCreates.length)}/${assessCreates.length}`);
    }
  }

  // Assign hand-authored + coding challenges with workspaces (not the full expanded 700 library)
  for (const c of SEED_WORKSPACE_CATALOG) {
    if (isExpandedLibrarySlug(c.slug)) continue;
    const assessId = featuredBySlug[c.slug] ?? `assess-lib-${c.slug}`;
    const primary =
      c.track === "CYBERSECURITY" || c.track === "PRIVACY_ENGINEERING"
        ? { user: cyberCandidate, key: "sam" }
        : { user: candidate, key: "casey" };

    const featured =
      c.slug === "saas-nexus" ||
      c.slug === "appsec-fortress" ||
      c.slug === "soc-nightwatch" ||
      c.slug === "team-forge";

    if (!featured) {
      await ensureAssignment({
        assessmentId: assessId,
        candidateId: primary.user.id,
        challengeSlug: c.slug,
        track: c.track,
        language: c.languages[0] === "python" ? "python" : "typescript",
      });
    }
  }

  // Mark SOC assignment under review with a seed score report for the reviewer queue
  await prisma.assessmentAssignment.update({
    where: { id: assignSoc.id },
    data: { status: "UNDER_REVIEW", submittedAt: new Date() },
  });
  const socReport = await prisma.scoreReport.findUnique({ where: { assignmentId: assignSoc.id } });
  if (!socReport) {
    await prisma.scoreReport.create({
      data: {
        assignmentId: assignSoc.id,
        overall: 88,
        frontend: 70,
        backend: 80,
        database: 75,
        architecture: 85,
        infrastructure: 82,
        security: 92,
        testing: 84,
        problemSolving: 90,
        performance: 78,
        collaboration: 80,
        qualified: false,
        tier: "NOT_QUALIFIED",
        mandatoryFailures: ["Human review pending — containment timeline completeness"],
        calibrated: true,
      },
    });
  }

  // Architecture packages ready for staff + candidates to inspect
  for (const row of [
    {
      id: "arch-casey-saas",
      assignmentId: assignSaas.id,
      title: "Nexus multi-tenant SaaS architecture",
    },
    {
      id: "arch-sam-appsec",
      assignmentId: assignCyber.id,
      title: "AppSec fortress trust boundaries",
    },
  ] as const) {
    const existingArch = await prisma.architectureSubmission.findUnique({ where: { id: row.id } });
    if (!existingArch) {
      await prisma.architectureSubmission.create({
        data: {
          id: row.id,
          assignmentId: row.assignmentId,
          proposal: `# ${row.title}

## Components
- Edge API
- Auth service
- Primary datastore
- Async workers

## Trust boundaries
- Public internet → edge
- Edge → private services
- Secrets only via vault / env injection

## Failure modes
- Dependency outage
- Poisoned queue messages
- Credential leak

## Mitigations
- Idempotency keys
- Least privilege IAM
- Structured audit logs
`,
          diagrams: {
            overview: "edge -> api -> db; api -> queue -> workers",
            trust: ["public", "edge", "private-services", "data"],
          },
          answers: {
            scaling: "Stateless API + managed Postgres + queue consumers",
            security: "mTLS between services, short-lived tokens, audit trail",
          },
          score: 82,
          feedback: "Solid trust-boundary articulation. Expand blast-radius analysis for queue poison messages.",
        },
      });
    }
  }

  // Team already formed for collaborative challenge
  const existingTeam = await prisma.engineeringTeam.findFirst({
    where: { name: "Forge Squad Alpha", assessmentId: assessmentTeam.id },
  });
  if (!existingTeam) {
    try {
      await createTeam({
        name: "Forge Squad Alpha",
        assessmentId: assessmentTeam.id,
        managerId: hiring.id,
        members: [
          {
            userId: candidate.id,
            roleLabel: "API / backend owner",
            duties: "Contracts, auth, persistence, integration tests",
          },
          {
            userId: teammate.id,
            roleLabel: "Client / security owner",
            duties: "UI flows, threat checks, PR review",
          },
        ],
      });
    } catch {
      // ignore if already exists from partial seed
    }
  }

  // Incident runs ready for cyber + SE candidates
  for (const row of [
    { slug: "token-exfil-beacon", candidateId: cyberCandidate.id, assignmentId: assignSoc.id },
    { slug: "checkout-dup-payments", candidateId: candidate.id, assignmentId: assignSaas.id },
  ]) {
    const scenario = await prisma.incidentScenario.findUnique({ where: { slug: row.slug } });
    if (!scenario) continue;
    const existingRun = await prisma.incidentRun.findFirst({
      where: { scenarioId: scenario.id, candidateId: row.candidateId },
    });
    if (!existingRun) {
      await prisma.incidentRun.create({
        data: {
          scenarioId: scenario.id,
          candidateId: row.candidateId,
          assignmentId: row.assignmentId,
          timeline: [{ at: new Date().toISOString(), event: "seeded_ready" }],
        },
      });
    }
  }

  // Follow-up question queued on SOC for the candidate
  const existingFollowup = await prisma.followUpQuestion.findFirst({
    where: { assignmentId: assignSoc.id },
  });
  if (!existingFollowup) {
    await prisma.followUpQuestion.create({
      data: {
        assignmentId: assignSoc.id,
        prompt:
          "Walk through how you would revoke the compromised service token without dropping legitimate checkout traffic.",
        basedOnPath: "playbooks/IR_TEMPLATE.md",
        difficulty: 2,
      },
    });
  }

  // SaaS: study plan enrollments + daily challenge
  await prisma.studyPlanEnrollment.upsert({
    where: { userId_planSlug: { userId: candidate.id, planSlug: "meta-75" } },
    create: {
      userId: candidate.id,
      planSlug: "meta-75",
      completedSlugs: ["lc-two-sum", "lc-valid-parens"],
    },
    update: {},
  });
  await prisma.studyPlanEnrollment.upsert({
    where: { userId_planSlug: { userId: premiumCandidate.id, planSlug: "stripe-2-weeks" } },
    create: {
      userId: premiumCandidate.id,
      planSlug: "stripe-2-weeks",
      completedSlugs: ["lc-idempotent-charge"],
    },
    update: {},
  });

  const { ensureDailyChallenge } = await import("@/server/saas/daily");
  const daily = await ensureDailyChallenge();
  await prisma.userStreak.upsert({
    where: { userId: candidate.id },
    create: { userId: candidate.id, currentStreak: 2, longestStreak: 5, lastDateKey: daily.dateKey },
    update: { currentStreak: 2, longestStreak: 5, lastDateKey: daily.dateKey },
  });

  // SaaS: sample playgrounds for free + premium accounts
  const playgroundCount = await prisma.playground.count({ where: { userId: candidate.id } });
  if (playgroundCount === 0) {
    await prisma.playground.create({
      data: {
        userId: candidate.id,
        name: "Scratchpad",
        folder: "Inbox",
        language: "typescript",
        content: `// Free plan: 3 playgrounds max. Upgrade for unlimited.\nexport function hello() {\n  return "crucible";\n}\n`,
      },
    });
  }
  const premiumPlaygrounds = await prisma.playground.count({ where: { userId: premiumCandidate.id } });
  if (premiumPlaygrounds === 0) {
    await prisma.playground.createMany({
      data: [
        {
          userId: premiumCandidate.id,
          name: "Graph drills",
          folder: "Interview Prep",
          language: "typescript",
          content: `// Premium playground — unlimited folders\nexport function bfs() { return []; }\n`,
        },
        {
          userId: premiumCandidate.id,
          name: "Stripe idempotency notes",
          folder: "Company Prep",
          language: "typescript",
          content: `// Company-specific scratch\nexport function charge() { return { ok: true }; }\n`,
        },
      ],
    });
  }

  // Guarantee every published assessment is timed (backfill nulls)
  const timedBackfill = await prisma.assessment.updateMany({
    where: { status: "PUBLISHED", timedMinutes: null },
    data: { timedMinutes: DEFAULT_TIMED_MINUTES },
  });

  // Public qualification profiles (finished — with years + completed scorecards)
  for (const row of [
    {
      userId: candidate.id,
      publicSlug: "casey-elite",
      headline: "Full-stack engineer — assessment-verified",
      bio: "Crucible-qualified software engineer. Skills below are assessment or human-review verified.",
      yearsExperience: 6,
      preferredTrack: "SECURE_FULL_STACK" as const,
    },
    {
      userId: cyberCandidate.id,
      publicSlug: "sam-appsec",
      headline: "AppSec / IR — human-reviewed",
      bio: "Cybersecurity track candidate. Public profile excludes claimed résumé skills.",
      yearsExperience: 5,
      preferredTrack: "CYBERSECURITY" as const,
    },
    {
      userId: premiumCandidate.id,
      publicSlug: "premium-prep",
      headline: "Premium prep · verified delivery",
      bio: "Interview prep plus timed assessments. Shareable qualification page for employers.",
      yearsExperience: 4,
      preferredTrack: "SOFTWARE_ENGINEERING" as const,
    },
  ]) {
    await prisma.candidateProfile.upsert({
      where: { userId: row.userId },
      create: {
        userId: row.userId,
        publicSlug: row.publicSlug,
        publicEnabled: true,
        headline: row.headline,
        bio: row.bio,
        yearsExperience: row.yearsExperience,
        preferredTrack: row.preferredTrack,
      },
      update: {
        publicSlug: row.publicSlug,
        publicEnabled: true,
        headline: row.headline,
        bio: row.bio,
        yearsExperience: row.yearsExperience,
        preferredTrack: row.preferredTrack,
      },
    });
  }

  // Finish showcase assignments so public profiles show real scorecards
  for (const row of [
    {
      assignmentId: assignSaas.id,
      overall: 93,
      tier: "ELITE" as const,
      qualified: true,
      security: 90,
      architecture: 94,
      backend: 95,
    },
    {
      assignmentId: assignCyber.id,
      overall: 91,
      tier: "ELITE" as const,
      qualified: true,
      security: 96,
      architecture: 88,
      backend: 86,
    },
  ]) {
    await prisma.assessmentAssignment.update({
      where: { id: row.assignmentId },
      data: { status: "COMPLETED", submittedAt: new Date() },
    });
    await prisma.scoreReport.upsert({
      where: { assignmentId: row.assignmentId },
      create: {
        assignmentId: row.assignmentId,
        overall: row.overall,
        frontend: 88,
        backend: row.backend,
        database: 90,
        architecture: row.architecture,
        infrastructure: 87,
        security: row.security,
        testing: 89,
        problemSolving: 92,
        performance: 85,
        collaboration: 86,
        qualified: row.qualified,
        tier: row.tier,
        calibrated: true,
        mandatoryFailures: [],
      },
      update: {
        overall: row.overall,
        frontend: 88,
        backend: row.backend,
        database: 90,
        architecture: row.architecture,
        infrastructure: 87,
        security: row.security,
        testing: 89,
        problemSolving: 92,
        performance: 85,
        collaboration: 86,
        qualified: row.qualified,
        tier: row.tier,
        calibrated: true,
        mandatoryFailures: [],
      },
    });
  }

  // Learner craft + arcade progress so ELITE demos aren't empty XP shells
  {
    const { INTERVIEW_CRAFT_PLAN_SLUG, INTERVIEW_LESSONS } = await import(
      "@/server/learning/interview-curriculum"
    );
    const { AI_CRAFT_PLAN_SLUG, AI_LESSONS } = await import("@/server/learning/ai-curriculum");
    const { ARCADE_PLAN_SLUG } = await import("@/server/learning/arcade-games");
    const { dateKey } = await import("@/server/saas/daily");
    const ivDone = INTERVIEW_LESSONS.map((l) => l.slug);
    const aiDone = AI_LESSONS.slice(0, 8).map((l) => l.slug);
    for (const row of [
      { userId: candidate.id, planSlug: INTERVIEW_CRAFT_PLAN_SLUG, completedSlugs: ivDone },
      { userId: candidate.id, planSlug: AI_CRAFT_PLAN_SLUG, completedSlugs: aiDone },
      {
        userId: candidate.id,
        planSlug: ARCADE_PLAN_SLUG,
        completedSlugs: ["framework-flow", "big-o-blitz", "pair-seeker", "binary-range"],
      },
      {
        userId: cyberCandidate.id,
        planSlug: INTERVIEW_CRAFT_PLAN_SLUG,
        completedSlugs: ivDone.slice(0, 8),
      },
      {
        userId: premiumCandidate.id,
        planSlug: INTERVIEW_CRAFT_PLAN_SLUG,
        completedSlugs: ivDone.slice(0, 10),
      },
    ]) {
      await prisma.studyPlanEnrollment.upsert({
        where: { userId_planSlug: { userId: row.userId, planSlug: row.planSlug } },
        create: {
          userId: row.userId,
          planSlug: row.planSlug,
          completedSlugs: row.completedSlugs,
        },
        update: { completedSlugs: row.completedSlugs },
      });
    }
    for (const userId of [candidate.id, cyberCandidate.id, premiumCandidate.id]) {
      await prisma.userStreak.upsert({
        where: { userId },
        create: {
          userId,
          currentStreak: 12,
          longestStreak: 21,
          lastDateKey: dateKey(new Date()),
        },
        update: {
          currentStreak: 12,
          longestStreak: 21,
          lastDateKey: dateKey(new Date()),
        },
      });
    }
  }

  // Ensure verified skills exist for public profiles
  for (const row of [
    { userId: candidate.id, name: "typescript", domain: "languages", source: "ASSESSMENT" as const },
    { userId: candidate.id, name: "system-design", domain: "architecture", source: "HUMAN_REVIEW" as const },
    { userId: cyberCandidate.id, name: "incident-response", domain: "cybersecurity", source: "ASSESSMENT" as const },
    { userId: cyberCandidate.id, name: "appsec", domain: "cybersecurity", source: "HUMAN_REVIEW" as const },
  ]) {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId: row.userId } });
    if (!profile) continue;
    await prisma.skillRecord.upsert({
      where: {
        profileId_name_source: { profileId: profile.id, name: row.name, source: row.source },
      },
      create: {
        profileId: profile.id,
        name: row.name,
        domain: row.domain,
        source: row.source,
        confidence: 0.9,
        evidence: "Seeded verified skill",
      },
      update: { confidence: 0.9, evidence: "Seeded verified skill" },
    });
  }

  const { upsertAdvancedMissions } = await import("@/server/challenges/mission-advanced");
  const advancedCount = await upsertAdvancedMissions(prisma);
  console.log(`Advanced missions upserted: ${advancedCount}`);

  const { seedEditorials } = await import("@/server/saas/editorials");
  await seedEditorials();
  const { ensureWeeklyChallenge } = await import("@/server/saas/weekly");
  await ensureWeeklyChallenge();
  const { ensureActiveContest } = await import("@/server/saas/contests");
  await ensureActiveContest();

  const [
    workspaceCount,
    fileCount,
    assignmentCount,
    assessmentCount,
    challengeCount,
    architectureCount,
    incidentRunCount,
  ] = await Promise.all([
    prisma.workspace.count(),
    prisma.workspaceFile.count(),
    prisma.assessmentAssignment.count(),
    prisma.assessment.count({ where: { status: "PUBLISHED" } }),
    prisma.challenge.count({ where: { isPublished: true } }),
    prisma.architectureSubmission.count(),
    prisma.incidentRun.count(),
  ]);

  const summary = {
    releaseReady: true,
    admin: admin.email,
    hiring: hiring.email,
    reviewer: reviewer.email,
    candidate: candidate.email,
    premiumCandidate: premiumCandidate.email,
    cyberCandidate: cyberCandidate.email,
    teammate: teammate.email,
    demoAccountsEnabled: canCreateDemos,
    policies: [
      engPolicy.name,
      cyberPolicy.name,
      securePolicy.name,
      srePolicy.name,
      dataPolicy.name,
      mobilePolicy.name,
      privacyPolicy.name,
    ],
    timedMinutesBackfilled: timedBackfill.count,
    publicProfiles: ["/u/casey-elite", "/u/sam-appsec", "/u/premium-prep"],
    ready: {
      publishedChallenges: challengeCount,
      publishedAssessments: assessmentCount,
      assignments: assignmentCount,
      workspaces: workspaceCount,
      workspaceFiles: fileCount,
      architecturePackages: architectureCount,
      incidentRuns: incidentRunCount,
      featuredAssignments: [assignSaas.id, assignCyber.id, assignSoc.id, assignTeamCasey.id],
    },
  };
  const { ensureDefaultAiModels } = await import("@/server/competition/ai-benchmark");
  const { upsertResearchFrontier } = await import("@/server/competition/research-frontier");
  const aiModels = await ensureDefaultAiModels();
  const frontier = await upsertResearchFrontier();
  console.log(`Competition: ${aiModels.length} AI models, ${frontier} Research Frontier seeds`);

  console.log("Seed complete — full platform ready.");
  console.log(summary);
  return summary;
}
