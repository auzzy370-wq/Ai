import { COMPANIES } from "@/lib/saas";
import {
  fetchAmazon,
  fetchApple,
  fetchGoogle,
  fetchGreenhouse,
  fetchLinkedInCompany,
  fetchNetflix,
  fetchShopify,
} from "./adapters";
import type { JobBoardResult, JobCompany, JobPosting, JobSource } from "./types";

type CacheEntry = { at: number; results: JobBoardResult[] };

const CACHE_TTL_MS = 45 * 60 * 1000;
let cache: CacheEntry | null = null;
let inflight: Promise<JobBoardResult[]> | null = null;

/** Official eng search pages — used when a live feed is empty or blocked. */
const CAREERS_SEARCH: Record<JobCompany, { url: string; source: JobSource }> = {
  Google: {
    url: "https://www.google.com/about/careers/applications/jobs/results/?q=Software%20Engineer",
    source: "google",
  },
  Meta: {
    url: "https://www.metacareers.com/jobs/?q=software%20engineer",
    source: "linkedin",
  },
  Amazon: {
    url: "https://www.amazon.jobs/en/search?base_query=software%20engineer",
    source: "amazon",
  },
  Apple: {
    url: "https://jobs.apple.com/en-us/search?search=software%20engineer&sort=relevance",
    source: "apple",
  },
  Microsoft: {
    url: "https://jobs.careers.microsoft.com/global/en/search?q=software%20engineer",
    source: "linkedin",
  },
  Stripe: {
    url: "https://stripe.com/jobs/search?q=software",
    source: "greenhouse",
  },
  Netflix: {
    url: "https://explore.jobs.netflix.net/careers?query=software%20engineer",
    source: "netflix",
  },
  Uber: {
    url: "https://www.uber.com/us/en/careers/list/?query=software%20engineer",
    source: "linkedin",
  },
  Cloudflare: {
    url: "https://www.cloudflare.com/careers/jobs/?department=Engineering",
    source: "greenhouse",
  },
  Bloomberg: {
    url: "https://careers.bloomberg.com/job/search?q=software%20engineer",
    source: "linkedin",
  },
  LinkedIn: {
    url: "https://careers.linkedin.com/",
    source: "linkedin",
  },
  Shopify: {
    url: "https://www.shopify.com/careers/search?q=software%20engineer",
    source: "shopify",
  },
};

function browseFallback(company: JobCompany): JobPosting {
  const dest = CAREERS_SEARCH[company];
  return {
    id: `browse-${company}`,
    company,
    title: `Browse ${company} engineering roles`,
    location: "Official careers site",
    team: "Open search",
    url: dest.url,
    source: dest.source,
  };
}

async function loadCompany(company: JobCompany): Promise<JobBoardResult> {
  const fetchedAt = new Date().toISOString();
  try {
    let jobs: JobPosting[] = [];
    switch (company) {
      case "Google":
        jobs = await fetchGoogle();
        break;
      case "Amazon":
        jobs = await fetchAmazon();
        break;
      case "Meta":
        jobs = await fetchLinkedInCompany("Meta", {
          companyId: 10667,
          keywords: "software engineer",
        });
        break;
      case "Apple":
        jobs = await fetchApple();
        break;
      case "Microsoft":
        jobs = await fetchLinkedInCompany("Microsoft", {
          companyId: 1035,
          keywords: "software engineer",
        });
        break;
      case "Stripe":
        jobs = await fetchGreenhouse("Stripe", "stripe");
        break;
      case "Netflix":
        jobs = await fetchNetflix();
        break;
      case "Uber":
        jobs = await fetchLinkedInCompany("Uber", {
          keywords: 'Uber "Software Engineer"',
          requireCompanyName: "Uber",
        });
        break;
      case "Cloudflare":
        jobs = await fetchGreenhouse("Cloudflare", "cloudflare");
        break;
      case "Bloomberg":
        jobs = await fetchLinkedInCompany("Bloomberg", {
          keywords: 'Bloomberg "Software Engineer"',
          requireCompanyName: "Bloomberg",
        });
        break;
      case "LinkedIn":
        jobs = await fetchLinkedInCompany("LinkedIn", {
          companyId: 1337,
          keywords: "software engineer",
        });
        break;
      case "Shopify":
        jobs = await fetchShopify();
        break;
      default:
        jobs = [];
    }
    if (!jobs.length) jobs = [browseFallback(company)];
    return { company, ok: true, jobs, fetchedAt };
  } catch (e) {
    return {
      company,
      ok: false,
      jobs: [browseFallback(company)],
      error: e instanceof Error ? e.message.slice(0, 160) : "Fetch failed",
      fetchedAt,
    };
  }
}

/** Sequential with a short gap so LinkedIn guest endpoints stay polite. */
async function refreshAll(): Promise<JobBoardResult[]> {
  const results: JobBoardResult[] = [];
  for (const company of COMPANIES) {
    results.push(await loadCompany(company));
    await new Promise((r) => setTimeout(r, 250));
  }
  return results;
}

export async function getJobBoard(opts?: { force?: boolean }): Promise<{
  results: JobBoardResult[];
  cached: boolean;
  refreshedAt: string;
}> {
  const now = Date.now();
  if (!opts?.force && cache && now - cache.at < CACHE_TTL_MS) {
    return {
      results: cache.results,
      cached: true,
      refreshedAt: new Date(cache.at).toISOString(),
    };
  }
  if (!inflight) {
    inflight = refreshAll()
      .then((results) => {
        cache = { at: Date.now(), results };
        return results;
      })
      .finally(() => {
        inflight = null;
      });
  }
  const results = await inflight;
  return {
    results,
    cached: false,
    refreshedAt: new Date(cache?.at ?? Date.now()).toISOString(),
  };
}

export function flattenJobs(results: JobBoardResult[]): JobPosting[] {
  return results.flatMap((r) => r.jobs);
}
