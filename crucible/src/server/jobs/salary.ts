import { decodeHtml } from "./decode";

export type SalaryInfo = {
  /** Normalized yearly minimum (USD when currency is USD). */
  min: number;
  /** Normalized yearly maximum. */
  max: number;
  currency: string;
  /** Display string, e.g. "$166,000 – $208,000 / year". */
  label: string;
};

function money(raw: string, hadK: boolean): number {
  let n = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n)) return NaN;
  if (hadK) n *= 1000;
  return Math.round(n);
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function plausibleYearly(min: number, max: number): boolean {
  if (!(min > 0 && max >= min)) return false;
  // Typical tech ranges; reject revenue/volume false positives.
  if (min < 25_000 || max > 1_200_000) return false;
  if (max / min > 8) return false;
  return true;
}

/**
 * Pull a yearly pay range from job description / board HTML when present
 * (CA/NY pay transparency, Greenhouse salary blurbs, etc.).
 */
export function parseYearlySalary(raw: string | null | undefined): SalaryInfo | null {
  if (!raw) return null;
  let text = decodeHtml(raw);
  text = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;

  const patterns: RegExp[] = [
    /(?:estimated\s+)?(?:annual\s+)?(?:base\s+)?(?:pay|salary|compensation)(?:\s+range)?(?:\s+for this role)?(?:\s+is|:)?\s*(?:of\s+)?(?:USD\s*)?\$?\s*([\d,]+(?:\.\d+)?)\s*(k)?\s*(?:-|–|—|to)\s*(?:USD\s*)?\$?\s*([\d,]+(?:\.\d+)?)\s*(k)?/i,
    /salary\s*range\s*\$?\s*([\d,]+)\s*(k)?\s*(?:-|–|to)\s*\$?\s*([\d,]+)\s*(k)?/i,
    /\$\s*([\d,]+)\s*(k)?\s*(?:-|–|to)\s*\$\s*([\d,]+)\s*(k)?\s*(?:USD)?\s*(?:per\s+year|\/\s*yr|\/\s*year|annually|a year)/i,
    /(?:base\s+pay|total\s+target\s+cash)[^$]{0,40}\$\s*([\d,]+)\s*(k)?\s*(?:-|–|to)\s*\$?\s*([\d,]+)\s*(k)?/i,
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (!m) continue;
    const min = money(m[1]!, Boolean(m[2]));
    const max = money(m[3]!, Boolean(m[4]));
    if (!plausibleYearly(min, max)) continue;
    return {
      min,
      max,
      currency: "USD",
      label: `${formatUsd(min)} – ${formatUsd(max)} / year`,
    };
  }

  // Hourly → yearly (US full-time ~2080 hours) when explicitly hourly.
  const hourly = text.match(
    /(?:hourly|per\s+hour|\/\s*hr|\/\s*hour)[^$]{0,20}\$\s*([\d,]+(?:\.\d+)?)\s*(?:-|–|to)\s*\$?\s*([\d,]+(?:\.\d+)?)/i,
  ) || text.match(
    /\$\s*([\d,]+(?:\.\d+)?)\s*(?:-|–|to)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:per\s+hour|\/\s*hr|\/\s*hour|hourly)/i,
  );
  if (hourly) {
    const minH = Number(hourly[1]!.replace(/,/g, ""));
    const maxH = Number(hourly[2]!.replace(/,/g, ""));
    if (minH >= 15 && maxH >= minH && maxH <= 500) {
      const min = Math.round(minH * 2080);
      const max = Math.round(maxH * 2080);
      if (plausibleYearly(min, max)) {
        return {
          min,
          max,
          currency: "USD",
          label: `${formatUsd(min)} – ${formatUsd(max)} / year`,
        };
      }
    }
  }

  return null;
}
