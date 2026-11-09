import { z } from "zod";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

/**
 * Only http(s) URLs for user-controlled links. Rejects javascript:, data:, etc.
 */
export function isSafeHttpUrl(raw: string, opts?: { allowHttp?: boolean }): boolean {
  const value = raw.trim();
  if (!value) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "https:" && protocol !== "http:") return false;
  const allowHttp = opts?.allowHttp ?? process.env.NODE_ENV !== "production";
  if (protocol === "http:" && !allowHttp) return false;
  const host = parsed.hostname.toLowerCase();
  if (!host || BLOCKED_HOSTS.has(host)) return false;
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (parsed.username || parsed.password) return false;
  return true;
}

/** Missing / empty OK; otherwise must be a safe http(s) URL. */
export const optionalSafeHttpUrl = z
  .union([
    z.literal(""),
    z
      .string()
      .max(2048)
      .refine((val) => isSafeHttpUrl(val), {
        message: "URL must be http(s) with a public host (javascript: and other schemes are blocked)",
      }),
  ])
  .optional();

/** Sanitize for href rendering — returns null if unsafe. */
export function safeHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return isSafeHttpUrl(raw, { allowHttp: true }) ? raw.trim() : null;
}
