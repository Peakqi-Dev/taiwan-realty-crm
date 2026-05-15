/**
 * The 5-line "what I can do" tutorial — used in the welcome reply and as
 * the response to the 「使用教學」 menu / quick-reply.
 */
export function tutorialText(): string {
  return [
    "📖 我會的事：",
    "• 建客戶：「王先生 3000 萬 信義區 三房」",
    "• 記帶看：「今天帶王先生看大安 他覺得太貴」",
    "• 設提醒：「提醒我下週三聯絡王先生」",
    "• 改資料：「改王先生預算 3500」",
    "• 看任務：「今天有什麼事」",
  ].join("\n");
}

/** Standard set of quick-reply chips shown after onboarding / tutorial. */
export const TUTORIAL_QUICK_REPLIES = [
  {
    type: "message" as const,
    label: "建立第一個客戶",
    text: "王先生 3000 萬 信義區 三房",
  },
  { type: "message" as const, label: "今天有什麼事", text: "今天有什麼事" },
  { type: "message" as const, label: "使用教學", text: "使用教學" },
];
