import { COMPANIES } from "@/lib/saas";
import {
  fetchAmazon,
  fetchApple,
  fetchGoogle,
  fetchGreenhouse,
  fetchLinkedInCompany,
  fetchNetflix,
  fetchShopify,
  mergeJobLists,
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

/** Cybersecurity browse links when a live feed is empty or blocked. */
const CAREERS_SEARCH_CYBER: Record<JobCompany, { url: string; source: JobSource }> = {
  Google: {
    url: "https://www.google.com/about/careers/applications/jobs/results/?q=Security%20Engineer",
    source: "google",
  },
  Meta: {
    url: "https://www.metacareers.com/jobs/?q=security%20engineer",
    source: "linkedin",
  },
  Amazon: {
    url: "https://www.amazon.jobs/en/search?base_query=security%20engineer",
    source: "amazon",
  },
  Apple: {
    url: "https://jobs.apple.com/en-us/search?search=security%20engineer&sort=relevance",
    source: "apple",
  },
  Microsoft: {
    url: "https://jobs.careers.microsoft.com/global/en/search?q=cybersecurity",
    source: "linkedin",
  },
  Stripe: {
    url: "https://stripe.com/jobs/search?q=security",
    source: "greenhouse",
  },
  Netflix: {
    url: "https://explore.jobs.netflix.net/careers?query=security%20engineer",
    source: "netflix",
  },
  Uber: {
    url: "https://www.uber.com/us/en/careers/list/?query=security%20engineer",
    source: "linkedin",
  },
  Cloudflare: {
    url: "https://www.cloudflare.com/careers/jobs/?department=Engineering",
    source: "greenhouse",
  },
  Bloomberg: {
    url: "https://careers.bloomberg.com/job/search?q=security%20engineer",
    source: "linkedin",
  },
  LinkedIn: {
    url: "https://www.linkedin.com/jobs/search/?keywords=cybersecurity%20LinkedIn",
    source: "linkedin",
  },
  Shopify: {
    url: "https://www.shopify.com/careers/search?q=security",
    source: "shopify",
  },
};

function browseFallback(company: JobCompany, focus: "engineering" | "cybersecurity" = "engineering"): JobPosting {
  const dest = focus === "cybersecurity" ? CAREERS_SEARCH_CYBER[company] : CAREERS_SEARCH[company];
  const title =
    focus === "cybersecurity"
      ? `Browse ${company} cybersecurity roles`
      : `Browse ${company} engineering roles`;
  return {
    id: `browse-${focus}-${company}`,
    company,
    title,
    location: "Official careers site",
    team: focus === "cybersecurity" ? "Security search" : "Open search",
    summary:
      focus === "cybersecurity"
        ? `Jump to ${company}'s official careers search for security and cybersecurity openings.`
        : `Jump to ${company}'s official careers search for software and engineering openings.`,
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
        jobs = mergeJobLists(
          ...(await Promise.all([
            fetchGoogle("Software Engineer"),
            fetchGoogle("Security Engineer"),
            fetchGoogle("Cybersecurity"),
          ])),
        );
        break;
      case "Amazon":
        jobs = mergeJobLists(
          ...(await Promise.all([
            fetchAmazon("software engineer"),
            fetchAmazon("security engineer"),
            fetchAmazon("cybersecurity"),
          ])),
        );
        break;
      case "Meta":
        jobs = mergeJobLists(
          ...(await Promise.all([
            fetchLinkedInCompany("Meta", { companyId: 10667, keywords: "software engineer" }),
            fetchLinkedInCompany("Meta", { companyId: 10667, keywords: "security engineer" }),
          ])),
        );
        break;
      case "Apple":
        jobs = mergeJobLists(
          ...(await Promise.all([
            fetchApple("software engineer"),
            fetchApple("security engineer"),
            fetchApple("cybersecurity"),
          ])),
        );
        break;
      case "Microsoft":
        jobs = mergeJobLists(
          ...(await Promise.all([
            fetchLinkedInCompany("Microsoft", { companyId: 1035, keywords: "software engineer" }),
            fetchLinkedInCompany("Microsoft", { companyId: 1035, keywords: "security engineer" }),
          ])),
        );
        break;
      case "Stripe":
        // Greenhouse board already includes security titles once looksLikeEngRole expands.
        jobs = await fetchGreenhouse("Stripe", "stripe");
        break;
      case "Netflix":
        jobs = mergeJobLists(
          ...(await Promise.all([
            fetchNetflix("software engineer"),
            fetchNetflix("security engineer"),
            fetchNetflix("cybersecurity"),
          ])),
        );
        break;
      case "Uber":
        jobs = mergeJobLists(
          ...(await Promise.all([
            fetchLinkedInCompany("Uber", {
              keywords: 'Uber "Software Engineer"',
              requireCompanyName: "Uber",
            }),
            fetchLinkedInCompany("Uber", {
              keywords: 'Uber "Security Engineer"',
              requireCompanyName: "Uber",
            }),
          ])),
        );
        break;
      case "Cloudflare":
        jobs = await fetchGreenhouse("Cloudflare", "cloudflare");
        break;
      case "Bloomberg":
        jobs = mergeJobLists(
          ...(await Promise.all([
            fetchLinkedInCompany("Bloomberg", {
              keywords: 'Bloomberg "Software Engineer"',
              requireCompanyName: "Bloomberg",
            }),
            fetchLinkedInCompany("Bloomberg", {
              keywords: 'Bloomberg "Security Engineer"',
              requireCompanyName: "Bloomberg",
            }),
          ])),
        );
        break;
      case "LinkedIn":
        jobs = mergeJobLists(
          ...(await Promise.all([
            fetchLinkedInCompany("LinkedIn", { companyId: 1337, keywords: "software engineer" }),
            fetchLinkedInCompany("LinkedIn", { companyId: 1337, keywords: "security engineer" }),
          ])),
        );
        break;
      case "Shopify":
        jobs = await fetchShopify();
        break;
      default:
        jobs = [];
    }
    if (!jobs.length) {
      jobs = [browseFallback(company, "engineering"), browseFallback(company, "cybersecurity")];
    }
    return { company, ok: true, jobs, fetchedAt };
  } catch (e) {
    return {
      company,
      ok: false,
      jobs: [browseFallback(company, "engineering"), browseFallback(company, "cybersecurity")],
      error: e instanceof Error ? e.message.slice(0, 160) : "Fetch failed",
      fetchedAt,
    };
  }
}

/** Parallel company refresh with bounded concurrency (keeps LinkedIn polite). */
async function refreshAll(): Promise<JobBoardResult[]> {
  const companies = [...COMPANIES];
  const out: JobBoardResult[] = new Array(companies.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(4, companies.length) }, async () => {
    while (next < companies.length) {
      const idx = next++;
      out[idx] = await loadCompany(companies[idx]!);
    }
  });
  await Promise.all(workers);
  return out;
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
