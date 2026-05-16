/**
 * Detects a "help me draft a reply to a customer" intent and extracts the
 * customer's question + any property hints (district / rooms / price band)
 * for the DB lookup that follows. Pure regex — no AI call.
 *
 * Triggers: "幫我回 / 幫我回覆 / 怎麼回 / 回覆客人 / 幫我回覆客人"
 * Pattern:  "客人問XX，幫我回" → question = "XX"
 */

const TRIGGERS = [
  /幫我回覆/,
  /幫我回信/,
  /幫我回/,
  /怎麼回(覆|信)?[?？]?$/,
  /回覆客人/,
];

const CUSTOMER_PREFIX = /^客人(問我|問|說|傳|跟我說)?[:：]?\s*/;

export interface DraftReplyHints {
  district: string | null;
  rooms: number | null;
  priceMin: number | null;
  priceMax: number | null;
}

export interface DraftReplyRequest {
  question: string;
  hints: DraftReplyHints;
}

const DISTRICT_NAMES = [
  "中正", "大同", "中山", "松山", "大安", "萬華",
  "信義", "士林", "北投", "內湖", "南港", "文山",
  "板橋", "新莊", "中和", "永和", "三重", "新店",
  "土城", "汐止", "淡水", "蘆洲",
];

const ROOM_WORDS: Record<string, number> = {
  一房: 1, 兩房: 2, 二房: 2, 三房: 3, 四房: 4, 五房: 5,
  "1房": 1, "2房": 2, "3房": 3, "4房": 4, "5房": 5,
};

function hasTrigger(text: string): boolean {
  return TRIGGERS.some((p) => p.test(text));
}

function stripTrigger(text: string): string {
  let body = text;
  for (const p of TRIGGERS) body = body.replace(p, "");
  // Trailing punctuation/spaces left behind.
  body = body.replace(/[,，。、！？!?\s]+$/, "");
  return body;
}

function stripCustomerPrefix(text: string): string {
  return text.replace(CUSTOMER_PREFIX, "");
}

function extractDistrict(text: string): string | null {
  for (const d of DISTRICT_NAMES) {
    if (text.includes(d)) return `${d}區`;
  }
  return null;
}

function extractRooms(text: string): number | null {
  for (const [w, n] of Object.entries(ROOM_WORDS)) {
    if (text.includes(w)) return n;
  }
  return null;
}

function extractPriceRange(text: string): { min: number | null; max: number | null } {
  // "3000-3500 萬" / "3000~3500萬"
  const range = text.match(/(\d{2,5})\s*[-~到]\s*(\d{2,5})\s*萬/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  // "3000 萬以內 / 3000 萬以下"
  const below = text.match(/(\d{2,5})\s*萬\s*(以內|以下)/);
  if (below) return { min: null, max: Number(below[1]) };
  // "3000 萬以上"
  const above = text.match(/(\d{2,5})\s*萬\s*(以上)/);
  if (above) return { min: Number(above[1]), max: null };
  // single "3000 萬" — treat as exact-ish max
  const single = text.match(/(\d{2,5})\s*萬/);
  if (single) {
    const v = Number(single[1]);
    return { min: Math.round(v * 0.9), max: Math.round(v * 1.1) };
  }
  return { min: null, max: null };
}

/**
 * Returns null when the message isn't a draft-reply request. Otherwise gives
 * the customer's question (trigger phrase stripped) and structured hints to
 * query the DB.
 */
export function parseDraftReplyRequest(text: string): DraftReplyRequest | null {
  if (!hasTrigger(text)) return null;
  const stripped = stripTrigger(text);
  const question = stripCustomerPrefix(stripped).trim();
  if (!question) return null;
  const { min, max } = extractPriceRange(question);
  return {
    question,
    hints: {
      district: extractDistrict(question),
      rooms: extractRooms(question),
      priceMin: min,
      priceMax: max,
    },
  };
}
