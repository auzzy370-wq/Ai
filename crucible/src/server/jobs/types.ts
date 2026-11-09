import type { COMPANIES } from "@/lib/saas";

export type JobCompany = (typeof COMPANIES)[number];

export type JobSource =
  | "greenhouse"
  | "amazon"
  | "google"
  | "apple"
  | "netflix"
  | "shopify"
  | "linkedin";

export type JobPosting = {
  id: string;
  company: JobCompany;
  title: string;
  location: string;
  team?: string;
  /** Short plain-text blurb from the posting when available. */
  summary?: string | null;
  url: string;
  source: JobSource;
  postedAt?: string | null;
  /** Yearly pay floor when the posting discloses it. */
  salaryMin?: number | null;
  /** Yearly pay ceiling when the posting discloses it. */
  salaryMax?: number | null;
  /** Display string, e.g. "$166,000 – $208,000 / year". */
  salaryLabel?: string | null;
  salaryCurrency?: string | null;
};

export type JobBoardResult = {
  company: JobCompany;
  ok: boolean;
  jobs: JobPosting[];
  error?: string;
  fetchedAt: string;
};
