/**
 * Regex fast-path for simple property-search queries — avoids the AI round
 * trip when the user typed something like 「找信義區 3000 萬 三房」.
 *
 * Returns null when the text doesn't look like a property search OR when
 * we couldn't extract anything useful, so the caller can fall through to
 * the AI classifier.
 */

import type { SearchCriteria } from "@/lib/line/property-search";

const SEARCH_KEYWORDS = [
  "找",
  "搜尋",
  "搜",
  "查",
  "幫我找",
  "客人要",
  "客戶要",
  "需要",
  "想找",
];

const ROOM_WORDS: Record<string, number> = {
  一房: 1, 兩房: 2, 二房: 2, 三房: 3, 四房: 4, 五房: 5,
  "1房": 1, "2房": 2, "3房": 3, "4房": 4, "5房": 5,
};

const DISTRICT_NAMES = [
  // 台北
  "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
  "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區",
  // 新北
  "板橋區", "新莊區", "中和區", "永和區", "三重區", "新店區",
  "土城區", "汐止區", "淡水區", "蘆洲區",
];

// Match district names with optional 區 suffix, e.g. 「信義」 or 「信義區」.
function extractDistricts(text: string): string[] {
  const hits = new Set<string>();
  for (const d of DISTRICT_NAMES) {
    if (text.includes(d)) hits.add(d);
    else {
      const short = d.slice(0, -1); // 「信義區」 → 「信義」
      if (short.length >= 2 && new RegExp(`(?<![一-龥])${short}(?![一-龥區])`).test(text)) {
        hits.add(d);
      }
    }
  }
  return Array.from(hits);
}

// "3000 萬"、"3000萬"、"3000-3500 萬"、"3000 萬以內"、"4000 萬以上"
function extractBudget(text: string): { min: number | null; max: number | null } {
  // Range first.
  const range = text.match(/(\d{2,5})\s*[-~到至]\s*(\d{2,5})\s*萬/);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }
  // 億 first (rare but possible).
  const yi = text.match(/(\d+(?:\.\d+)?)\s*億/);
  let cap: number | null = null;
  if (yi) cap = Math.round(Number(yi[1]) * 10000);
  const single = text.match(/(\d{2,5})\s*萬/);
  if (single) {
    const n = Number(single[1]);
    if (/以內|以下|不到/.test(text)) return { min: null, max: n };
    if (/以上|起跳/.test(text)) return { min: n, max: null };
    return { min: n, max: n };
  }
  if (cap !== null) {
    if (/以內|以下/.test(text)) return { min: null, max: cap };
    return { min: cap, max: cap };
  }
  return { min: null, max: null };
}

function extractRooms(text: string): number | null {
  for (const [word, n] of Object.entries(ROOM_WORDS)) {
    if (text.includes(word)) return n;
  }
  return null;
}

/**
 * Returns SearchCriteria if the text reads like a property search AND has
 * at least one extractable criterion. Otherwise null.
 */
export function parseSearchByRegex(text: string): SearchCriteria | null {
  const looksLikeSearch =
    SEARCH_KEYWORDS.some((k) => text.includes(k)) ||
    /物件|案|房子|房屋/.test(text);
  if (!looksLikeSearch) return null;

  const districts = extractDistricts(text);
  const { min, max } = extractBudget(text);
  const rooms = extractRooms(text);

  // Need at least one concrete criterion to be useful.
  if (districts.length === 0 && min === null && max === null && rooms === null) {
    return null;
  }

  return {
    districts,
    budgetMin: min,
    budgetMax: max,
    rooms,
  };
}
