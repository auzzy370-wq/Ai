/**
 * Smart code autocomplete for Premium.
 * Uses OpenAI when configured; otherwise a language-aware local completer
 * (still smarter than word-based Monaco — pattern templates from cursor context).
 */

export type CompletionSuggestion = {
  label: string;
  insertText: string;
  detail: string;
};

export async function completeCode(params: {
  language: string;
  path: string;
  prefix: string;
  suffix: string;
}): Promise<CompletionSuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && process.env.AI_FALLBACK_MOCK !== "true") {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey });
      const res = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content:
              "You are a code completion engine. Return ONLY the code to insert at the cursor (no markdown fences, no explanation). Keep it short (1-8 lines).",
          },
          {
            role: "user",
            content: `Language: ${params.language}\nFile: ${params.path}\nPREFIX:\n${params.prefix.slice(-1500)}\nSUFFIX:\n${params.suffix.slice(0, 500)}\nComplete the next tokens.`,
          },
        ],
      });
      const text = res.choices[0]?.message?.content?.trim();
      if (text) {
        return [{ label: "AI complete", insertText: text.replace(/^```\\w*\\n?|```$/g, ""), detail: "Crucible AI" }];
      }
    } catch {
      /* fall through to local */
    }
  }

  return localCompletions(params);
}

function localCompletions(params: {
  language: string;
  path: string;
  prefix: string;
}): CompletionSuggestion[] {
  const lastLine = params.prefix.split("\n").pop() ?? "";
  const trimmed = lastLine.trim();
  const lang = params.language;
  const out: CompletionSuggestion[] = [];

  if (/twoSum|two_sum|TwoSum/i.test(params.prefix) && /Map|dict|make\(map/i.test(params.prefix) === false) {
    if (lang === "python") {
      out.push({
        label: "hash-map two-sum body",
        detail: "Crucible pattern",
        insertText:
          "seen = {}\n    for i, n in enumerate(nums):\n        need = target - n\n        if need in seen:\n            return [seen[need], i]\n        seen[n] = i\n    return []",
      });
    } else if (lang === "go") {
      out.push({
        label: "map two-sum body",
        detail: "Crucible pattern",
        insertText:
          "seen := map[int]int{}\n\tfor i, n := range nums {\n\t\tif j, ok := seen[target-n]; ok {\n\t\t\treturn []int{j, i}\n\t\t}\n\t\tseen[n] = i\n\t}\n\treturn nil",
      });
    } else {
      out.push({
        label: "Map two-sum body",
        detail: "Crucible pattern",
        insertText:
          "const seen = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i]!;\n    if (seen.has(need)) return [seen.get(need)!, i];\n    seen.set(nums[i]!, i);\n  }\n  return [];",
      });
    }
  }

  if (/for\s*\(\s*let\s+i/.test(trimmed) || trimmed.endsWith("for (")) {
    out.push({
      label: "for-i loop",
      detail: "snippet",
      insertText: "let i = 0; i < n; i++) {\n  \n}",
    });
  }

  if (trimmed.endsWith("if (") || trimmed.endsWith("if(")) {
    out.push({
      label: "null guard",
      detail: "snippet",
      insertText: "x == null) return;",
    });
  }

  if (lang === "python" && (trimmed.endsWith("def ") || /def \w+\($/.test(trimmed))) {
    out.push({
      label: "typed def",
      detail: "snippet",
      insertText: "solve(nums: list[int], target: int) -> list[int]:\n    ",
    });
  }

  if (trimmed.includes("TODO") || trimmed.includes("// ") || trimmed.endsWith("//")) {
    out.push({
      label: "complexity comment",
      detail: "snippet",
      insertText: " O(n) time, O(n) space",
    });
  }

  if (!out.length) {
    out.push({
      label: "return early",
      detail: "snippet",
      insertText: lang === "python" ? "return None" : "return;",
    });
  }

  return out.slice(0, 5);
}
