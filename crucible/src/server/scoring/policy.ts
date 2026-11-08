export const DEFAULT_WEIGHTS = {
  frontend: 10,
  backend: 15,
  database: 10,
  architecture: 15,
  infrastructure: 10,
  security: 10,
  testing: 10,
  problemSolving: 10,
  performance: 5,
  collaboration: 5,
} as const;

/** Cybersecurity track: security/detection/identity weighted higher; UI polish de-emphasized. */
export const CYBERSECURITY_WEIGHTS = {
  frontend: 5,
  backend: 10,
  database: 5,
  architecture: 10,
  infrastructure: 10,
  security: 25,
  testing: 10,
  problemSolving: 15,
  performance: 5,
  collaboration: 5,
} as const;

/** Secure full-stack: balanced engineering with elevated security bar. */
export const SECURE_FULL_STACK_WEIGHTS = {
  frontend: 8,
  backend: 12,
  database: 8,
  architecture: 12,
  infrastructure: 10,
  security: 20,
  testing: 10,
  problemSolving: 10,
  performance: 5,
  collaboration: 5,
} as const;

/** Platform / SRE: infrastructure, reliability, and incident craft. */
export const PLATFORM_SRE_WEIGHTS = {
  frontend: 3,
  backend: 10,
  database: 5,
  architecture: 12,
  infrastructure: 25,
  security: 10,
  testing: 10,
  problemSolving: 15,
  performance: 5,
  collaboration: 5,
} as const;

/** Data / ML engineering: pipelines, features, serving. */
export const DATA_ML_WEIGHTS = {
  frontend: 3,
  backend: 18,
  database: 18,
  architecture: 14,
  infrastructure: 10,
  security: 8,
  testing: 12,
  problemSolving: 10,
  performance: 5,
  collaboration: 2,
} as const;

/** Mobile engineering: client craft with security and performance. */
export const MOBILE_WEIGHTS = {
  frontend: 20,
  backend: 12,
  database: 5,
  architecture: 10,
  infrastructure: 8,
  security: 15,
  testing: 10,
  problemSolving: 10,
  performance: 8,
  collaboration: 2,
} as const;

/** Privacy engineering: purpose, consent, minimization, evidence. */
export const PRIVACY_WEIGHTS = {
  frontend: 5,
  backend: 12,
  database: 10,
  architecture: 12,
  infrastructure: 8,
  security: 25,
  testing: 10,
  problemSolving: 10,
  performance: 3,
  collaboration: 5,
} as const;

export type WeightMap = Record<keyof ScoreBreakdown, number>;

export function weightsForTrack(track?: string): WeightMap {
  if (track === "CYBERSECURITY" || track === "CLOUD_INFRA_SECURITY" || track === "BLOCKCHAIN") {
    return { ...CYBERSECURITY_WEIGHTS };
  }
  if (track === "SECURE_FULL_STACK" || track === "HEALTHCARE" || track === "REGTECH") {
    return { ...SECURE_FULL_STACK_WEIGHTS };
  }
  if (track === "PLATFORM_SRE" || track === "NETWORK_EDGE" || track === "QA_RELIABILITY") {
    return { ...PLATFORM_SRE_WEIGHTS };
  }
  if (track === "DATA_ML" || track === "AI_MLOPS" || track === "SEARCH_RECS" || track === "DATABASE_ENGINEERING") {
    return { ...DATA_ML_WEIGHTS };
  }
  if (track === "MOBILE" || track === "DESIGN_SYSTEMS" || track === "EMBEDDED_IOT") {
    return { ...MOBILE_WEIGHTS };
  }
  if (track === "PRIVACY_ENGINEERING") return { ...PRIVACY_WEIGHTS };
  // FINTECH, GAME_BACKEND, DEVTOOLS, GROWTH, EDTECH, LOGISTICS, CLIMATE_ENERGY,
  // SUPPORT_ENG, COMPILER_TOOLING → balanced engineering defaults
  return { ...DEFAULT_WEIGHTS };
}

export type ScoreBreakdown = {
  frontend: number;
  backend: number;
  database: number;
  architecture: number;
  infrastructure: number;
  security: number;
  testing: number;
  problemSolving: number;
  performance: number;
  collaboration: number;
};

export const CRITICAL_CATEGORIES = [
  "frontend",
  "backend",
  "database",
  "architecture",
  "infrastructure",
  "security",
  "testing",
  "problemSolving",
] as const;

export function computeOverall(scores: ScoreBreakdown, weights: WeightMap = { ...DEFAULT_WEIGHTS }) {
  let total = 0;
  let max = 0;
  (Object.keys(weights) as (keyof WeightMap)[]).forEach((key) => {
    total += (scores[key] / 100) * weights[key];
    max += weights[key];
  });
  return (total / max) * 100;
}

export function qualificationTier(overall: number) {
  if (overall >= 98) return "DISTINGUISHED" as const;
  if (overall >= 95) return "EXCEPTIONAL" as const;
  if (overall >= 90) return "ELITE" as const;
  return "NOT_QUALIFIED" as const;
}

export function evaluateMandatory(params: {
  overall: number;
  scores: ScoreBreakdown;
  weights?: WeightMap;
  deploymentOk: boolean;
  hiddenTestsOk: boolean;
  incidentOk: boolean;
  architectureOk: boolean;
  teamOk: boolean;
  humanApproved: boolean;
  criticalSecurity: boolean;
  minOverall?: number;
  minCategoryPct?: number;
}) {
  const weights = params.weights ?? DEFAULT_WEIGHTS;
  const minOverall = params.minOverall ?? 90;
  const minCategoryPct = params.minCategoryPct ?? 80;
  const failures: string[] = [];

  if (params.overall < minOverall) failures.push(`Overall score below ${minOverall}`);
  for (const key of CRITICAL_CATEGORIES) {
    const pct = params.scores[key];
    if (pct < minCategoryPct) failures.push(`${key} below ${minCategoryPct}%`);
  }
  if (!params.deploymentOk) failures.push("Deployment verification failed");
  if (!params.hiddenTestsOk) failures.push("Hidden tests incomplete");
  if (!params.incidentOk) failures.push("Production incident recovery incomplete");
  if (!params.architectureOk) failures.push("Architecture assessment incomplete");
  if (!params.teamOk) failures.push("Team integration assessment incomplete");
  if (!params.humanApproved) failures.push("Human technical reviewer approval required");
  if (params.criticalSecurity) failures.push("Unresolved critical security vulnerabilities");

  const qualified = failures.length === 0 && params.overall >= minOverall;
  return {
    qualified,
    failures,
    tier: qualified ? qualificationTier(params.overall) : ("NOT_QUALIFIED" as const),
    weights,
  };
}
