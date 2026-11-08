/**
 * Comprehensive CRUCIBLE platform smoke — auth, SaaS surfaces, coding judge path.
 */
const BASE = process.env.APP_URL || "http://127.0.0.1:3847";

const results = [];
function ok(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? " — " + detail : ""}`);
}
function fail(name, detail) {
  results.push({ name, ok: false, detail: String(detail) });
  console.error(`FAIL  ${name} — ${detail}`);
}

async function login(email, password) {
  const jar = new Map();
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (k && v) jar.set(k.trim(), v.trim());
  }
  const json = await res.json();
  if (!json.ok) throw new Error(`login ${email}: ${JSON.stringify(json)}`);
  return {
    jar,
    user: json.data,
    cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
  };
}

async function api(cookie, path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      cookie,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, status: res.status };
}

async function page(cookie, path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie },
    redirect: "manual",
  });
  return { status: res.status, location: res.headers.get("location") };
}

async function main() {
  console.log("Platform smoke against", BASE);

  // Health / login page
  {
    const res = await fetch(`${BASE}/login`);
    if (res.status === 200) ok("login_page", String(res.status));
    else fail("login_page", res.status);
  }

  // Demo accounts
  const accounts = [
    ["admin@crucible.local", process.env.DEMO_ADMIN_PASSWORD || ""],
    ["hiring@crucible.local", process.env.DEMO_ADMIN_PASSWORD || ""],
    ["reviewer@crucible.local", process.env.DEMO_ADMIN_PASSWORD || ""],
    ["candidate@crucible.local", process.env.DEMO_CANDIDATE_PASSWORD || ""],
    ["premium@crucible.local", process.env.DEMO_CANDIDATE_PASSWORD || ""],
    ["cyber@crucible.local", process.env.DEMO_CANDIDATE_PASSWORD || ""],
    ["teammate@crucible.local", process.env.DEMO_CANDIDATE_PASSWORD || ""],
  ];
  const sessions = {};
  for (const [email, pw] of accounts) {
    try {
      sessions[email] = await login(email, pw);
      ok(`login:${email.split("@")[0]}`, sessions[email].user.role);
    } catch (e) {
      fail(`login:${email}`, e.message);
    }
  }

  const free = sessions["candidate@crucible.local"];
  const premium = sessions["premium@crucible.local"];
  const hiring = sessions["hiring@crucible.local"];
  const admin = sessions["admin@crucible.local"];

  // Authenticated app routes
  const routes = [
    "/dashboard",
    "/challenges",
    "/daily",
    "/study-plans",
    "/interview",
    "/playgrounds",
    "/pricing",
    "/assessments",
    "/candidates",
    "/reviews",
    "/teams",
    "/incidents",
    "/architecture",
    "/workspace",
    "/admin",
    "/settings",
  ];
  if (admin) {
    for (const r of routes) {
      const { status } = await page(admin.cookie, r);
      if (status === 200) ok(`page:${r}`, String(status));
      else fail(`page:${r}`, status);
    }
  }

  // Challenges API
  if (free) {
    const { json } = await api(free.cookie, "/api/challenges");
    const list = json.data || [];
    const coding = list.filter((c) => c.type === "CODING_PROBLEM" || (c.tags || []).includes("coding"));
    if (json.ok && list.length >= 50) ok("challenges_api", `${list.length} total, ${coding.length} coding`);
    else fail("challenges_api", JSON.stringify({ ok: json.ok, n: list.length }));
  }

  // Daily
  if (free) {
    const { json } = await api(free.cookie, "/api/daily");
    if (json.ok && json.data?.challenge?.slug) ok("daily_get", json.data.challenge.title);
    else fail("daily_get", JSON.stringify(json));

    const start = await api(free.cookie, "/api/daily", { method: "POST" });
    if (start.json.ok && start.json.data?.workspaceId) ok("daily_start", start.json.data.workspaceId);
    else fail("daily_start", JSON.stringify(start.json));
  }

  // Study plans
  if (free) {
    const { json } = await api(free.cookie, "/api/study-plans");
    if (json.ok && json.data?.plans?.length >= 4) {
      ok("study_plans_list", `${json.data.plans.length} plans`);
      const meta = json.data.plans.find((p) => p.slug === "meta-75");
      if (meta?.enrolled) ok("study_plan_enrolled", `meta-75 ${meta.percent}%`);
      else fail("study_plan_enrolled", JSON.stringify(meta));
    } else fail("study_plans_list", JSON.stringify(json));

    // Free cannot enroll premium plan
    const stripe = await api(free.cookie, "/api/study-plans", {
      method: "POST",
      body: JSON.stringify({ planSlug: "stripe-2-weeks" }),
    });
    if (stripe.status === 402 || stripe.json?.error?.code === "PREMIUM_REQUIRED") {
      ok("study_plan_premium_gate", "402 as expected");
    } else fail("study_plan_premium_gate", JSON.stringify(stripe.json));
  }

  if (premium) {
    const enr = await api(premium.cookie, "/api/study-plans", {
      method: "POST",
      body: JSON.stringify({ planSlug: "stripe-2-weeks" }),
    });
    if (enr.json.ok) ok("study_plan_premium_enroll", enr.json.data?.planSlug || "ok");
    else fail("study_plan_premium_enroll", JSON.stringify(enr.json));
  }

  // Playgrounds
  if (free) {
    const { json } = await api(free.cookie, "/api/playgrounds");
    if (json.ok) ok("playgrounds_list", `${json.data.playgrounds?.length ?? 0} (limit ${json.data.limit})`);
    else fail("playgrounds_list", JSON.stringify(json));

    // Fill to limit then expect 402
    const current = json.data.playgrounds?.length ?? 0;
    const limit = json.data.limit ?? 3;
    for (let i = current; i < limit; i++) {
      await api(free.cookie, "/api/playgrounds", {
        method: "POST",
        body: JSON.stringify({ name: `Smoke ${i}`, folder: "Smoke" }),
      });
    }
    const over = await api(free.cookie, "/api/playgrounds", {
      method: "POST",
      body: JSON.stringify({ name: "Over limit", folder: "Smoke" }),
    });
    if (over.status === 402 || over.json?.error?.code === "PLAN_LIMIT") ok("playground_free_limit", "402");
    else fail("playground_free_limit", JSON.stringify(over.json));
  }

  if (premium) {
    const create = await api(premium.cookie, "/api/playgrounds", {
      method: "POST",
      body: JSON.stringify({ name: "Premium pad", folder: "Unlimited" }),
    });
    if (create.json.ok) {
      ok("playground_premium_create", create.json.data.id);
      const patch = await api(premium.cookie, `/api/playgrounds/${create.json.data.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: "// saved\n" }),
      });
      if (patch.json.ok) ok("playground_cloud_save", "patched");
      else fail("playground_cloud_save", JSON.stringify(patch.json));
    } else fail("playground_premium_create", JSON.stringify(create.json));
  }

  // Interview sims — free blocked, premium ok
  if (free) {
    const blocked = await api(free.cookie, "/api/interview", {
      method: "POST",
      body: JSON.stringify({ company: "Google", role: "Software Engineer" }),
    });
    if (blocked.status === 402) ok("interview_free_blocked", "402");
    else fail("interview_free_blocked", JSON.stringify(blocked.json));
  }
  if (premium) {
    const sim = await api(premium.cookie, "/api/interview", {
      method: "POST",
      body: JSON.stringify({ company: "Google", role: "Software Engineer" }),
    });
    if (sim.json.ok && sim.json.data?.workspaceId) ok("interview_premium_start", sim.json.data.workspaceId);
    else fail("interview_premium_start", JSON.stringify(sim.json));
  }

  // Billing checkout mock
  if (free) {
    // use a throwaway? free candidate already free — checkout mock upgrades them
    // Use teammate instead to not break free tests later — already ran free limits
  }
  if (sessions["teammate@crucible.local"]) {
    const tm = sessions["teammate@crucible.local"];
    const checkout = await api(tm.cookie, "/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ interval: "monthly" }),
    });
    if (checkout.json.ok && checkout.json.data?.mode === "mock" && checkout.json.data?.url) {
      ok("billing_checkout_mock", checkout.json.data.mode);
    } else fail("billing_checkout_mock", JSON.stringify(checkout.json));
  }

  // Assessments + workspace coding path
  if (hiring && free) {
    const { json: assessments } = await api(hiring.cookie, "/api/assessments");
    const twoSum = (assessments.data || []).find((a) => a.challenge?.slug === "lc-two-sum" || a.title?.includes("Two Sum"));
    const assess = twoSum || (assessments.data || []).find((a) => a.challenge?.type === "CODING_PROBLEM");
    if (!assess) fail("find_coding_assessment", "none");
    else {
      ok("find_coding_assessment", assess.title);
      // Find existing workspace for candidate on two-sum via challenges page data — use daily workspace or assignments
      const { json: assigns } = await api(free.cookie, "/api/assignments").catch(() => ({ json: {} }));
      // Fallback: open daily workspace already created
    }
  }

  // Coding workspace: get files, save solution, run tests
  if (free) {
    // Get workspace from candidate via prisma-less approach: list from execute after finding id from daily POST again
    const d = await api(free.cookie, "/api/daily", { method: "POST" });
    const wsId = d.json.data?.workspaceId;
    if (!wsId) fail("coding_workspace", "no workspace");
    else {
      ok("coding_workspace", wsId);
      // Save a correct two-sum if that's today's — otherwise just run whatever
      const solution = `export function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (map.has(need)) return [map.get(need)!, i];
    map.set(nums[i], i);
  }
  return [];
}
export function isValid(s: string): boolean {
  const st: string[] = [];
  const m: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  for (const ch of s) {
    if ("([{".includes(ch)) st.push(ch);
    else if (m[ch]) { if (st.pop() !== m[ch]) return false; }
  }
  return st.length === 0;
}
export function merge(intervals: number[][]): number[][] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a,b)=>a[0]-b[0]);
  const out = [sorted[0].slice()];
  for (let i=1;i<sorted.length;i++) {
    const last = out[out.length-1];
    if (sorted[i][0] <= last[1]) last[1] = Math.max(last[1], sorted[i][1]);
    else out.push(sorted[i].slice());
  }
  return out;
}
export function topKFrequent(nums: number[], k: number): number[] {
  const freq = new Map<number, number>();
  for (const n of nums) freq.set(n, (freq.get(n)||0)+1);
  return [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,k).map(([n])=>n);
}
export function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const g: number[][] = Array.from({length:numCourses},()=>[]);
  const indeg = Array(numCourses).fill(0);
  for (const [a,b] of prerequisites) { g[b].push(a); indeg[a]++; }
  const q = indeg.map((d,i)=>d===0?i:-1).filter(i=>i>=0);
  let seen = 0;
  while (q.length) {
    const u = q.shift()!;
    seen++;
    for (const v of g[u]) if (--indeg[v]===0) q.push(v);
  }
  return seen === numCourses;
}
export function wordBreak(s: string, wordDict: string[]): boolean {
  const set = new Set(wordDict);
  const dp = Array(s.length+1).fill(false);
  dp[0]=true;
  for (let i=1;i<=s.length;i++) for (let j=0;j<i;j++) if (dp[j] && set.has(s.slice(j,i))) { dp[i]=true; break; }
  return dp[s.length];
}
export function minWindow(s: string, t: string): string {
  if (!t) return "";
  const need = new Map<string, number>();
  for (const ch of t) need.set(ch, (need.get(ch)||0)+1);
  let missing = need.size, left = 0, best = "", bestLen = Infinity;
  const win = new Map<string, number>();
  for (let right=0; right<s.length; right++) {
    const c = s[right];
    win.set(c, (win.get(c)||0)+1);
    if (need.has(c) && win.get(c)===need.get(c)) missing--;
    while (missing===0) {
      if (right-left+1 < bestLen) { bestLen = right-left+1; best = s.slice(left, right+1); }
      const l = s[left++];
      win.set(l, (win.get(l)||0)-1);
      if (need.has(l) && (win.get(l)||0) < need.get(l)!) missing++;
    }
  }
  return best;
}
export class LRUCache {
  private cap: number;
  private map = new Map<number, number>();
  constructor(capacity: number) { this.cap = capacity; }
  get(key: number): number {
    if (!this.map.has(key)) return -1;
    const v = this.map.get(key)!;
    this.map.delete(key); this.map.set(key, v);
    return v;
  }
  put(key: number, value: number): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.cap) this.map.delete(this.map.keys().next().value);
  }
}
export class HitCounter {
  private hits: number[] = [];
  hit(timestamp: number): void { this.hits.push(timestamp); }
  getHits(timestamp: number): number {
    const from = timestamp - 299;
    return this.hits.filter(t => t >= from && t <= timestamp).length;
  }
}
export function strongPassword(password: string): boolean {
  if (password.length < 8 || password.length > 64) return false;
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*]/.test(password)) return false;
  const lower = password.toLowerCase();
  const target = "password";
  let found = false;
  for (let i=0;i<=lower.length-target.length;i++) {
    let match = true;
    for (let j=0;j<target.length;j++) if (lower[i+j]!==target[j]) match=false;
    if (match) found = true;
  }
  return !found;
}
export function charge(intentId: string, amount: number): { status: "ok"|"duplicate"; totalCharged: number } {
  // @ts-ignore
  globalThis.__charges = globalThis.__charges || new Map();
  // @ts-ignore
  const m: Map<string, number> = globalThis.__charges;
  if (m.has(intentId)) {
    let total = 0; for (const v of m.values()) total += v;
    return { status: "duplicate", totalCharged: total };
  }
  m.set(intentId, amount);
  let total = 0; for (const v of m.values()) total += v;
  return { status: "ok", totalCharged: total };
}
export class TreeNode {
  val: number; left: TreeNode|null; right: TreeNode|null;
  constructor(val=0,left:TreeNode|null=null,right:TreeNode|null=null){this.val=val;this.left=left;this.right=right;}
}
export function serialize(root: TreeNode|null): string {
  if (!root) return "null";
  return JSON.stringify([root.val, serialize(root.left), serialize(root.right)]);
}
export function deserialize(data: string): TreeNode|null {
  if (data === "null" || data === "") return null;
  const [val, left, right] = JSON.parse(data);
  return new TreeNode(val, deserialize(left), deserialize(right));
}
`;
      const put = await api(free.cookie, `/api/workspace/${wsId}/files`, {
        method: "PUT",
        body: JSON.stringify({ path: "src/solution.ts", content: solution, language: "typescript" }),
      });
      if (put.json.ok) ok("coding_save_solution", "src/solution.ts");
      else fail("coding_save_solution", JSON.stringify(put.json));

      const run = await api(free.cookie, `/api/workspace/${wsId}/execute`, {
        method: "POST",
        body: JSON.stringify({ type: "test" }),
      });
      if (run.json.ok) ok("coding_enqueue_test", run.json.data?.id || run.json.data?.status);
      else fail("coding_enqueue_test", JSON.stringify(run.json));

      // Wait for job completion
      await new Promise((r) => setTimeout(r, 3500));
      // Re-fetch workspace page isn't API — check via prisma through execute isn't available
      // Soft check: enqueue succeeded
    }
  }

  // Setup health
  {
    const res = await fetch(`${BASE}/api/setup`);
    const json = await res.json();
    if (json?.data?.databaseReachable || json?.ok) ok("setup_health", JSON.stringify(json.data || json).slice(0, 120));
    else fail("setup_health", JSON.stringify(json));
  }

  // Static presentation
  for (const p of ["/presentation.html", "/presentation-script.html"]) {
    const res = await fetch(`${BASE}${p}`);
    if (res.status === 200) ok(`static:${p}`, String(res.status));
    else fail(`static:${p}`, res.status);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error("Failures:");
    for (const f of failed) console.error(" -", f.name, f.detail);
    process.exit(1);
  }
  console.log("Platform smoke PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
