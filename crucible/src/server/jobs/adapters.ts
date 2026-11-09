import type { JobCompany, JobPosting, JobSource } from "./types";
import { decodeHtml, looksLikeEngRole, titleFromSlug } from "./decode";
import { parseYearlySalary } from "./salary";

/** Merge board pages / keyword searches and keep first occurrence per id. */
export function mergeJobLists(...lists: JobPosting[][]): JobPosting[] {
  const seen = new Set<string>();
  const out: JobPosting[] = [];
  for (const list of lists) {
    for (const job of list) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      out.push(job);
    }
  }
  return out;
}

const UA =
  "Mozilla/5.0 (compatible; CrucibleJobs/1.0; +https://crucible.dev; research; respectful)";

async function fetchText(url: string, init: RequestInit = {}, timeoutMs = 18_000): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "user-agent": UA,
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const text = await fetchText(url, {
    ...init,
    headers: { accept: "application/json", ...(init.headers ?? {}) },
  });
  return JSON.parse(text) as T;
}

function post(
  company: JobCompany,
  source: JobSource,
  partial: Omit<JobPosting, "company" | "source">,
): JobPosting {
  return { company, source, ...partial };
}

function withSalary(
  partial: Omit<JobPosting, "company" | "source">,
  text: string | null | undefined,
): Omit<JobPosting, "company" | "source"> {
  const sal = parseYearlySalary(text);
  if (!sal) return partial;
  return {
    ...partial,
    salaryMin: sal.min,
    salaryMax: sal.max,
    salaryLabel: sal.label,
    salaryCurrency: sal.currency,
  };
}

export async function fetchGreenhouse(company: JobCompany, board: string): Promise<JobPosting[]> {
  // content=true includes description HTML — needed for CA/NY pay ranges.
  const data = await fetchJson<{
    jobs?: {
      id: number;
      title: string;
      absolute_url: string;
      location?: { name?: string };
      updated_at?: string;
      content?: string;
    }[];
  }>(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
  return (data.jobs ?? [])
    .filter((j) => looksLikeEngRole(j.title))
    .slice(0, 80)
    .map((j) =>
      post(
        company,
        "greenhouse",
        withSalary(
          {
            id: `gh-${board}-${j.id}`,
            title: decodeHtml(j.title),
            location: j.location?.name?.trim() || "See posting",
            url: j.absolute_url,
            postedAt: j.updated_at ?? null,
          },
          j.content,
        ),
      ),
    );
}

export async function fetchAmazon(query = "software engineer"): Promise<JobPosting[]> {
  const url = `https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent(query)}&offset=0&result_limit=60&sort=relevant`;
  const data = await fetchJson<{
    jobs?: {
      id?: string;
      job_id?: string;
      title?: string;
      job_path?: string;
      location?: string;
      city?: string;
      country_code?: string;
      posted_date?: string;
      job_category?: string;
      description?: string;
      basic_qualifications?: string;
    }[];
  }>(url);
  return (data.jobs ?? [])
    .filter((j) => j.title && looksLikeEngRole(j.title))
    .slice(0, 80)
    .map((j) => {
      const id = String(j.id || j.job_id || "");
      const path = j.job_path?.startsWith("/") ? j.job_path : `/en/jobs/${id}`;
      return post(
        "Amazon",
        "amazon",
        withSalary(
          {
            id: `amzn-${id}`,
            title: decodeHtml(j.title!),
            location: [j.city || j.location, j.country_code].filter(Boolean).join(", ") || "See posting",
            team: j.job_category || undefined,
            url: `https://www.amazon.jobs${path}`,
            postedAt: j.posted_date ?? null,
          },
          `${j.description || ""}\n${j.basic_qualifications || ""}`,
        ),
      );
    });
}

export async function fetchGoogle(query = "Software Engineer"): Promise<JobPosting[]> {
  const html = await fetchText(
    `https://www.google.com/about/careers/applications/jobs/results/?q=${encodeURIComponent(query)}&hl=en_US`,
  );
  const seen = new Set<string>();
  const jobs: JobPosting[] = [];
  for (const m of html.matchAll(/jobs\/results\/(\d+)-([a-z0-9-]+)/gi)) {
    const id = m[1]!;
    const slug = m[2]!;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = titleFromSlug(slug);
    if (!looksLikeEngRole(title)) continue;
    jobs.push(
      post("Google", "google", {
        id: `goog-${id}`,
        title,
        location: "See posting",
        url: `https://www.google.com/about/careers/applications/jobs/results/${id}-${slug}`,
      }),
    );
    if (jobs.length >= 60) break;
  }
  return jobs;
}

export async function fetchApple(query = "software engineer"): Promise<JobPosting[]> {
  const html = await fetchText(
    `https://jobs.apple.com/en-us/search?search=${encodeURIComponent(query)}&page=1`,
  );
  const seen = new Set<string>();
  const jobs: JobPosting[] = [];
  for (const m of html.matchAll(/href="(\/en-us\/details\/(\d+)\/([^"?]+))/g)) {
    const id = m[2]!;
    const slug = m[3]!;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = titleFromSlug(slug);
    if (
      !looksLikeEngRole(title) &&
      !/engineer|developer|software|siri|ml|ai|security|cyber|infosec|appsec/i.test(slug)
    ) {
      continue;
    }
    jobs.push(
      post("Apple", "apple", {
        id: `apple-${id}`,
        title,
        location: "See posting",
        url: `https://jobs.apple.com${m[1]}`,
      }),
    );
    if (jobs.length >= 60) break;
  }
  return jobs;
}

export async function fetchNetflix(query = "software engineer"): Promise<JobPosting[]> {
  const url = `https://explore.jobs.netflix.net/api/apply/v2/jobs?domain=netflix.com&start=0&num=60&query=${encodeURIComponent(query)}&sort_by=relevance`;
  const data = await fetchJson<{
    positions?: {
      id: number;
      name: string;
      locations?: string[];
      location?: string;
      department?: string;
      canonicalPositionUrl?: string;
      t_create?: string;
      job_description?: string;
    }[];
  }>(url);
  return (data.positions ?? [])
    .filter((p) => looksLikeEngRole(p.name))
    .map((p) =>
      post(
        "Netflix",
        "netflix",
        withSalary(
          {
            id: `nflx-${p.id}`,
            title: decodeHtml(p.name),
            location: (p.locations?.[0] || p.location || "See posting").replace(/,/g, ", "),
            team: p.department,
            url: p.canonicalPositionUrl || `https://explore.jobs.netflix.net/careers/job/${p.id}`,
            postedAt: p.t_create ?? null,
          },
          p.job_description,
        ),
      ),
    );
}

export async function fetchShopify(): Promise<JobPosting[]> {
  const xml = await fetchText("https://www.shopify.com/careers/feed.xml");
  const jobs: JobPosting[] = [];
  const pick = (chunk: string, tag: string) => {
    const m = chunk.match(
      new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))\\s*</${tag}>`, "i"),
    );
    return decodeHtml((m?.[1] ?? m?.[2] ?? "").trim());
  };
  for (const block of xml.matchAll(/<job>([\s\S]*?)<\/job>/gi)) {
    const chunk = block[1]!;
    const title = pick(chunk, "title");
    const url = pick(chunk, "applyUrl") || pick(chunk, "url") || pick(chunk, "link");
    const location = pick(chunk, "location") || pick(chunk, "city") || "See posting";
    const team = pick(chunk, "department") || pick(chunk, "workplaceTypes") || undefined;
    const description = pick(chunk, "description");
    const id = pick(chunk, "partnerJobId") || pick(chunk, "id") || url;
    if (!title || !url || !looksLikeEngRole(title)) continue;
    jobs.push(
      post(
        "Shopify",
        "shopify",
        withSalary(
          {
            id: `shopify-${id}`,
            title,
            location,
            team,
            url: url.split("?")[0] || url,
          },
          description,
        ),
      ),
    );
    if (jobs.length >= 80) break;
  }
  return jobs;
}

type LiCard = { title: string; location: string; url: string; companyName: string };

function parseLinkedInCards(html: string): LiCard[] {
  const cards: LiCard[] = [];
  for (const part of html.split("base-card").slice(1)) {
    const href = part.match(/href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"?]+)/)?.[1];
    const title = part.match(/base-search-card__title[^>]*>\s*([^<]+)/)?.[1];
    const location = part.match(/job-search-card__location[^>]*>\s*([^<]+)/)?.[1];
    const companyName = part.match(/base-search-card__subtitle[\s\S]*?<a[^>]*>\s*([^<]+)/)?.[1];
    if (!href || !title) continue;
    cards.push({
      title: decodeHtml(title),
      location: decodeHtml(location || "See posting"),
      url: href,
      companyName: decodeHtml(companyName || ""),
    });
  }
  return cards;
}

export async function fetchLinkedInCompany(
  company: JobCompany,
  opts: { companyId?: number; keywords: string; requireCompanyName?: string },
): Promise<JobPosting[]> {
  const params = new URLSearchParams({
    keywords: opts.keywords,
    start: "0",
  });
  if (opts.companyId) params.set("f_C", String(opts.companyId));
  const html = await fetchText(
    `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`,
    { headers: { accept: "text/html" } },
  );
  const want = (opts.requireCompanyName || company).toLowerCase();
  return parseLinkedInCards(html)
    .filter((c) => c.companyName.toLowerCase().includes(want))
    .filter((c) => looksLikeEngRole(c.title))
    .slice(0, 40)
    .map((c, i) =>
      post(company, "linkedin", {
        id: `li-${company}-${c.url.match(/(\d+)\/?$/)?.[1] || i}`,
        title: c.title,
        location: c.location,
        url: c.url,
      }),
    );
}
