/**
 * Lightweight intent classifier for the multi-turn confirm flow.
 * No AI — pattern matching is enough and avoids extra latency.
 */

const CONFIRM_PATTERNS = [
  /^對$/, /^沒錯/, /^是$/, /^是的/, /^確認/, /^好$/, /^好的/, /^可以/,
  /^ok$/i, /^yes$/i, /^y$/i,
];

const CANCEL_PATTERNS = [
  /^取消/, /^算了/, /^不要/, /^不用/, /^別建/, /^停$/, /^cancel/i, /^no$/i, /^n$/i,
];

// "改 預算 2500"、"改成預算 2500"、"修改 區域 信義區"
const PATCH_PREFIXES = [/^改成?\s*/, /^修改\s*/, /^改\s*/];

// Common ways users ask "what do I need to do today" — skip AI to save ~6s.
const TODAY_TASKS_PATTERNS = [
  /^今天有什麼/, /^今日.{0,3}(任務|待辦|要做|該做|事項)$/, /^今天該做什麼/,
  /^today\??$/i,
];

export type Intent =
  | { kind: "confirm" }
  | { kind: "cancel" }
  | { kind: "patch"; instruction: string }
  | { kind: "today_tasks" }
  | { kind: "freeform" };

export function classifyIntent(text: string): Intent {
  const trimmed = text.trim();
  if (!trimmed) return { kind: "freeform" };

  if (CONFIRM_PATTERNS.some((p) => p.test(trimmed))) return { kind: "confirm" };
  if (CANCEL_PATTERNS.some((p) => p.test(trimmed))) return { kind: "cancel" };
  if (TODAY_TASKS_PATTERNS.some((p) => p.test(trimmed))) return { kind: "today_tasks" };

  for (const prefix of PATCH_PREFIXES) {
    if (prefix.test(trimmed)) {
      return { kind: "patch", instruction: trimmed.replace(prefix, "") };
    }
  }

  return { kind: "freeform" };
}
