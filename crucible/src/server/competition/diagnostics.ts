/**
 * Intelligent failure diagnostics — separates contestant vs infrastructure errors.
 * Hidden tests: category only, never inputs/expected.
 */

export type DiagnosticCategory =
  | "accepted"
  | "wrong_answer"
  | "runtime_error"
  | "compile_error"
  | "time_limit"
  | "memory_limit"
  | "infrastructure_error"
  | "incomplete";

export type JudgeDiagnostic = {
  category: DiagnosticCategory;
  contestantFault: boolean;
  public: boolean;
  summary: string;
  expected?: string;
  actual?: string;
  hint?: string;
};

export function diagnoseJobResult(opts: {
  status: string;
  type: string;
  stdout?: string | null;
  stderr?: string | null;
  exitCode?: number | null;
  timedOut?: boolean;
}): JudgeDiagnostic {
  const hidden = opts.type === "hidden_test";
  if (opts.timedOut || opts.status === "TIMEOUT") {
    return {
      category: "time_limit",
      contestantFault: true,
      public: !hidden,
      summary: "Time limit exceeded",
      hint: hidden ? "Optimize hot paths; hidden inputs not disclosed." : "Check asymptotic complexity.",
    };
  }
  if (opts.status === "FAILED" && /ENOMEM|heap out of memory|memory/i.test(opts.stderr ?? "")) {
    return {
      category: "memory_limit",
      contestantFault: true,
      public: !hidden,
      summary: "Memory limit exceeded",
    };
  }
  if (/SyntaxError|error TS\d+|cannot find module|Compilation/i.test(opts.stderr ?? "")) {
    return {
      category: "compile_error",
      contestantFault: true,
      public: true,
      summary: "Compilation / syntax error",
      actual: (opts.stderr ?? "").slice(0, 500),
    };
  }
  if (/sandbox|ENOENT.*harness|infrastructure|Internal/i.test(opts.stderr ?? "") && opts.exitCode === 1) {
    // Heuristic — prefer not blaming contestant for harness missing
    if (/harness|ENOENT|not found/i.test(opts.stderr ?? "")) {
      return {
        category: "infrastructure_error",
        contestantFault: false,
        public: true,
        summary: "Infrastructure / harness error — not counted as your failure.",
        actual: (opts.stderr ?? "").slice(0, 300),
      };
    }
  }

  // Parse JSON results line
  try {
    const line = (opts.stdout ?? "")
      .trim()
      .split("\n")
      .reverse()
      .find((l) => l.trim().startsWith("{"));
    if (line) {
      const parsed = JSON.parse(line) as {
        results?: { name: string; pass: boolean; hidden?: boolean; got?: unknown; expected?: unknown }[];
      };
      const results = parsed.results ?? [];
      const failed = results.find((r) => !r.pass);
      if (!failed && results.length && results.every((r) => r.pass)) {
        return { category: "accepted", contestantFault: false, public: !hidden, summary: "Accepted" };
      }
      if (failed) {
        if (hidden || failed.hidden) {
          return {
            category: "wrong_answer",
            contestantFault: true,
            public: false,
            summary: `Hidden case failed (${failed.name}) — inputs/expected not disclosed.`,
          };
        }
        return {
          category: "wrong_answer",
          contestantFault: true,
          public: true,
          summary: `Wrong Answer on ${failed.name}`,
          expected: failed.expected !== undefined ? JSON.stringify(failed.expected) : undefined,
          actual: failed.got !== undefined ? JSON.stringify(failed.got) : undefined,
        };
      }
    }
  } catch {
    /* fall through */
  }

  if (opts.status === "SUCCEEDED") {
    return { category: "accepted", contestantFault: false, public: !hidden, summary: "Accepted" };
  }
  if (opts.stderr) {
    return {
      category: "runtime_error",
      contestantFault: true,
      public: !hidden,
      summary: "Runtime error",
      actual: hidden ? undefined : opts.stderr.slice(0, 500),
      hint: hidden ? "Runtime failure on hidden suite." : undefined,
    };
  }
  return {
    category: "incomplete",
    contestantFault: false,
    public: true,
    summary: "No conclusive judge output yet",
  };
}
