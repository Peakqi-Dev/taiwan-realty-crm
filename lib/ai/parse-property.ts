/**
 * Regex fast-path for create_property — skips MiniMax when the message
 * starts with a clear "this is a new listing" trigger. Pattern coverage:
 *
 *   新物件 / 新增物件 / 新的物件 / 我有物件 / 我有新物件 / 委託 + ...
 *
 * Followed by free text containing optional district / price / rooms /
 * status. Returns null when the trigger is absent or no useful field
 * can be extracted, so the AI classifier takes over.
 */

import type { PropertyDraft } from "@/lib/ai/classify-intent";

const TRIGGERS = [
  /^新物件/,
  /^新增物件/,
  /^新的物件/,
  /^我有(新)?物件/,
  /^我有(個|一個)?新?物件/,
  /^新接(到)?(個|一個)?(委託|物件)/,
  /^委託[^：]{0,5}[A-Za-z一-鿿]/,
];

const ROOM_WORDS: Record<string, number> = {
  一房: 1, 兩房: 2, 二房: 2, 三房: 3, 四房: 4, 五房: 5,
  "1房": 1, "2房": 2, "3房": 3, "4房": 4, "5房": 5,
};

const STATUS_WORDS = ["委託中", "帶看中", "議價中", "成交", "解除委託"] as const;

const DISTRICT_NAMES = [
  "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
  "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區",
  "板橋區", "新莊區", "中和區", "永和區", "三重區", "新店區",
  "土城區", "汐止區", "淡水區", "蘆洲區",
];

function looksLikeNewListing(text: string): boolean {
  return TRIGGERS.some((p) => p.test(text));
}

function extractTitle(text: string): string {
  // Strip the leading trigger and take the next meaningful chunk as title.
  let body = text;
  for (const p of TRIGGERS) {
    body = body.replace(p, "");
  }
  // First non-empty meaningful clause — strip leading punctuation/space.
  body = body.replace(/^[\s,，：:;；]+/, "");
  // Stop at first 「X萬」「X房」「X 區」 because those are separate fields.
  const stopRe = /(\s|,|，|，)?\d+(\.\d+)?\s*(萬|億|坪|房)|[一二三四五六1-5]房|(信義|大安|中山|松山|大同|中正|萬華|內湖|南港|文山|士林|北投|板橋|新莊|中和|永和|三重|新店|土城|汐止|淡水|蘆洲)區?/;
  const m = body.match(stopRe);
  if (m && m.index !== undefined && m.index > 0) {
    return body.slice(0, m.index).trim();
  }
  return body.trim();
}

function extractDistrict(text: string): string | null {
  for (const d of DISTRICT_NAMES) {
    if (text.includes(d)) return d;
    const short = d.slice(0, -1);
    if (short.length >= 2 && new RegExp(`(?<![一-龥])${short}(?![一-龥區])`).test(text)) {
      return d;
    }
  }
  return null;
}

function extractPrice(text: string): number | null {
  const yi = text.match(/(\d+(?:\.\d+)?)\s*億/);
  if (yi) return Math.round(Number(yi[1]) * 10000);
  const wan = text.match(/(\d{2,5})\s*萬/);
  if (wan) return Number(wan[1]);
  return null;
}

function extractRooms(text: string): number | null {
  for (const [w, n] of Object.entries(ROOM_WORDS)) {
    if (text.includes(w)) return n;
  }
  return null;
}

function extractStatus(text: string): PropertyDraft["status"] {
  for (const s of STATUS_WORDS) {
    if (text.includes(s)) return s as PropertyDraft["status"];
  }
  return null;
}

export function parsePropertyByRegex(text: string): PropertyDraft | null {
  if (!looksLikeNewListing(text)) return null;
  const title = extractTitle(text);
  if (!title) return null;
  return {
    title,
    address: null,
    district: extractDistrict(text),
    price: extractPrice(text),
    type: "買賣",
    status: extractStatus(text) ?? "委託中",
    rooms: extractRooms(text),
    bathrooms: null,
    area: null,
    description: "",
  };
}
