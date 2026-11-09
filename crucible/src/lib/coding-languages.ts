/** Languages with real coding-bank public/hidden judges. */
export const CODING_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "go",
  "rust",
  "java",
] as const;

export type CodingLanguage = (typeof CODING_LANGUAGES)[number];

export const CODING_LANGUAGE_LABELS: Record<CodingLanguage, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java",
};

export function normalizeCodingLanguage(raw: string | null | undefined): CodingLanguage {
  const v = (raw ?? "typescript").toLowerCase().trim();
  if (v === "ts") return "typescript";
  if (v === "js" || v === "node") return "javascript";
  if (v === "py") return "python";
  if (v === "golang") return "go";
  if ((CODING_LANGUAGES as readonly string[]).includes(v)) return v as CodingLanguage;
  return "typescript";
}

export function entryPathForLanguage(lang: CodingLanguage): string {
  switch (lang) {
    case "python":
      return "src/solution.py";
    case "go":
      return "solution/solution.go";
    case "rust":
      return "src/lib.rs";
    case "java":
      return "src/Solution.java";
    case "javascript":
      return "src/solution.js";
    default:
      return "src/solution.ts";
  }
}

export function imageTagForCodingLanguage(language: string): string {
  const lang = normalizeCodingLanguage(language);
  switch (lang) {
    case "python":
      return "crucible/python:3.12";
    case "go":
      return "crucible/go:1.22";
    case "rust":
      return "crucible/rust:1.78";
    case "java":
      return "crucible/java:21";
    default:
      return "crucible/node:20";
  }
}
