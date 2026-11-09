/**
 * Granular skills Crucible can pinpoint after public/hidden tests.
 * Challenges map tags → skill ids; diagnostics aggregate pass/fail by skill + difficulty.
 */
export type SkillDef = {
  id: string;
  name: string;
  domain: string;
  aliases?: string[];
};

export const SKILL_TAXONOMY: SkillDef[] = [
  // Algorithms / coding
  { id: "arrays", name: "Arrays & indexing", domain: "algorithms", aliases: ["array"] },
  { id: "hash-table", name: "Hash maps / sets", domain: "algorithms", aliases: ["hash", "hashmap", "map"] },
  { id: "two-pointers", name: "Two pointers", domain: "algorithms" },
  { id: "sliding-window", name: "Sliding window", domain: "algorithms", aliases: ["window"] },
  { id: "binary-search", name: "Binary search", domain: "algorithms" },
  { id: "sorting", name: "Sorting", domain: "algorithms", aliases: ["sort"] },
  { id: "stack", name: "Stacks", domain: "algorithms" },
  { id: "queue", name: "Queues / deques", domain: "algorithms" },
  { id: "linked-list", name: "Linked lists", domain: "algorithms" },
  { id: "trees", name: "Trees / BST", domain: "algorithms", aliases: ["tree", "bst"] },
  { id: "graphs", name: "Graphs / BFS-DFS", domain: "algorithms", aliases: ["graph", "bfs", "dfs"] },
  { id: "heap", name: "Heaps / priority queues", domain: "algorithms", aliases: ["priority-queue"] },
  { id: "dp", name: "Dynamic programming", domain: "algorithms", aliases: ["dynamic-programming"] },
  { id: "greedy", name: "Greedy algorithms", domain: "algorithms" },
  { id: "backtracking", name: "Backtracking", domain: "algorithms" },
  { id: "bit-manipulation", name: "Bit manipulation", domain: "algorithms", aliases: ["bits"] },
  { id: "math", name: "Math / number theory", domain: "algorithms" },
  { id: "strings", name: "String processing", domain: "algorithms", aliases: ["string"] },
  { id: "recursion", name: "Recursion", domain: "algorithms" },
  { id: "complexity", name: "Time/space complexity", domain: "algorithms", aliases: ["big-o", "performance"] },

  // Backend / systems
  { id: "api-design", name: "API design", domain: "backend", aliases: ["api", "rest", "graphql"] },
  { id: "authn", name: "Authentication", domain: "security", aliases: ["auth", "login", "session"] },
  { id: "authz", name: "Authorization / RBAC", domain: "security", aliases: ["rbac", "acl"] },
  { id: "tenancy", name: "Multi-tenant isolation", domain: "architecture", aliases: ["multi-tenant", "tenant"] },
  { id: "idempotency", name: "Idempotency", domain: "backend", aliases: ["idempotent"] },
  { id: "transactions", name: "Transactions / consistency", domain: "database", aliases: ["acid", "consistency"] },
  { id: "concurrency", name: "Concurrency / races", domain: "backend", aliases: ["race", "locking"] },
  { id: "caching", name: "Caching", domain: "performance", aliases: ["cache", "cdn"] },
  { id: "queues", name: "Queues / async jobs", domain: "backend", aliases: ["jobs", "events", "messaging"] },
  { id: "realtime", name: "Realtime / WebSockets", domain: "backend", aliases: ["websocket", "ws"] },
  { id: "pagination", name: "Pagination / cursors", domain: "backend" },
  { id: "observability", name: "Observability", domain: "infrastructure", aliases: ["metrics", "tracing", "logging"] },
  { id: "deploy", name: "Deploy / containers", domain: "infrastructure", aliases: ["docker", "k8s", "deploy"] },
  { id: "slo", name: "SLOs / error budgets", domain: "infrastructure", aliases: ["sre"] },
  { id: "dr", name: "Disaster recovery", domain: "infrastructure", aliases: ["failover", "backup"] },

  // Security / privacy
  { id: "appsec", name: "Application security", domain: "security", aliases: ["owasp", "xss", "sqli", "ssrf", "csrf", "idor"] },
  { id: "crypto", name: "Cryptography engineering", domain: "security", aliases: ["cryptography", "jwt", "tls", "kdf"] },
  { id: "cloud-security", name: "Cloud security", domain: "security", aliases: ["iam", "cloud"] },
  { id: "detection", name: "Detection engineering", domain: "security", aliases: ["sigma", "soc", "siem"] },
  { id: "incident-response", name: "Incident response", domain: "security", aliases: ["ir", "forensics"] },
  { id: "threat-modeling", name: "Threat modeling", domain: "security", aliases: ["stride", "dpia"] },
  { id: "privacy", name: "Privacy engineering", domain: "privacy", aliases: ["consent", "dsar", "pii", "gdpr", "retention"] },
  { id: "supply-chain", name: "Supply-chain security", domain: "security", aliases: ["sbom"] },

  // Data / ML / mobile
  { id: "data-modeling", name: "Data modeling", domain: "data", aliases: ["warehouse", "scd", "schema"] },
  { id: "pipelines", name: "Data pipelines", domain: "data", aliases: ["etl", "cdc", "streaming"] },
  { id: "ml-serving", name: "ML serving / features", domain: "ml", aliases: ["ml", "feature-store", "inference", "rag"] },
  { id: "mobile", name: "Mobile engineering", domain: "mobile", aliases: ["offline", "push", "ota", "attestation"] },
  { id: "frontend", name: "Frontend / a11y", domain: "frontend", aliases: ["a11y", "spa", "ssr", "ui"] },
  { id: "testing", name: "Automated testing", domain: "quality", aliases: ["tests", "regression", "contracts"] },
  { id: "architecture", name: "Architecture / ADRs", domain: "architecture", aliases: ["adr"] },
];

const ALIAS_INDEX = (() => {
  const m = new Map<string, string>();
  for (const s of SKILL_TAXONOMY) {
    m.set(s.id, s.id);
    m.set(s.name.toLowerCase(), s.id);
    for (const a of s.aliases ?? []) m.set(a.toLowerCase(), s.id);
  }
  return m;
})();

export function resolveSkillId(token: string): string | null {
  const key = token.toLowerCase().trim();
  if (!key || key === "coding" || key === "expanded-library") return null;
  return ALIAS_INDEX.get(key) ?? null;
}

export function skillsFromTags(tags: string[]): string[] {
  const out = new Set<string>();
  for (const t of tags) {
    const id = resolveSkillId(t);
    if (id) out.add(id);
  }
  return [...out];
}

export function skillName(id: string): string {
  return SKILL_TAXONOMY.find((s) => s.id === id)?.name ?? id;
}

export function skillDomain(id: string): string {
  return SKILL_TAXONOMY.find((s) => s.id === id)?.domain ?? "general";
}
