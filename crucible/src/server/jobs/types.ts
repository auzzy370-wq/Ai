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
  url: string;
  source: JobSource;
  postedAt?: string | null;
};

export type JobBoardResult = {
  company: JobCompany;
  ok: boolean;
  jobs: JobPosting[];
  error?: string;
  fetchedAt: string;
};
