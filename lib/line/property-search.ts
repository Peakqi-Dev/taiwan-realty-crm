/**
 * Build search URLs for the major Taiwan real estate portals from a parsed
 * SearchCriteria. Each builder returns null when it can't construct a clean
 * link for the given criteria — the caller skips those platforms rather
 * than guessing.
 */

export interface SearchCriteria {
  /** Taiwan administrative districts, e.g. ["信義區", "大安區"]. */
  districts: string[];
  /** Price min in 萬元. */
  budgetMin: number | null;
  /** Price max in 萬元. */
  budgetMax: number | null;
  /** Number of bedrooms (3 for 三房). */
  rooms: number | null;
  /** Free-text notes (passed to AI when the regex path fell short). */
  notes?: string;
}

interface DistrictMeta {
  region: "台北市" | "新北市";
  /** 591 regionid value. */
  regionId: number;
  /** 591 sectionid value (numeric). */
  sectionId: number;
}

// 591 region + section IDs. Based on observed URLs as of 2026-05.
const DISTRICTS: Record<string, DistrictMeta> = {
  // 台北市 — regionid 1
  中正區: { region: "台北市", regionId: 1, sectionId: 4 },
  大同區: { region: "台北市", regionId: 1, sectionId: 11 },
  中山區: { region: "台北市", regionId: 1, sectionId: 8 },
  松山區: { region: "台北市", regionId: 1, sectionId: 7 },
  大安區: { region: "台北市", regionId: 1, sectionId: 5 },
  萬華區: { region: "台北市", regionId: 1, sectionId: 12 },
  信義區: { region: "台北市", regionId: 1, sectionId: 6 },
  士林區: { region: "台北市", regionId: 1, sectionId: 9 },
  北投區: { region: "台北市", regionId: 1, sectionId: 10 },
  內湖區: { region: "台北市", regionId: 1, sectionId: 1 },
  南港區: { region: "台北市", regionId: 1, sectionId: 13 },
  文山區: { region: "台北市", regionId: 1, sectionId: 14 },
  // 新北市 — regionid 3 (sectionid mapping is best-effort)
  板橋區: { region: "新北市", regionId: 3, sectionId: 25 },
  新莊區: { region: "新北市", regionId: 3, sectionId: 26 },
  中和區: { region: "新北市", regionId: 3, sectionId: 27 },
  永和區: { region: "新北市", regionId: 3, sectionId: 28 },
  三重區: { region: "新北市", regionId: 3, sectionId: 29 },
  新店區: { region: "新北市", regionId: 3, sectionId: 30 },
  土城區: { region: "新北市", regionId: 3, sectionId: 31 },
  汐止區: { region: "新北市", regionId: 3, sectionId: 32 },
  淡水區: { region: "新北市", regionId: 3, sectionId: 33 },
  蘆洲區: { region: "新北市", regionId: 3, sectionId: 34 },
};

function firstKnownDistrict(districts: string[]): { name: string; meta: DistrictMeta } | null {
  for (const d of districts) {
    if (DISTRICTS[d]) return { name: d, meta: DISTRICTS[d] };
  }
  return null;
}

/** 591 — most reliable URL builder. */
function build591(c: SearchCriteria): string | null {
  const params: string[] = [];
  const hit = firstKnownDistrict(c.districts);
  if (hit) {
    params.push(`regionid=${hit.meta.regionId}`);
    params.push(`sectionid=${hit.meta.sectionId}`);
  }
  if (c.budgetMin !== null) params.push(`priceL=${c.budgetMin}`);
  if (c.budgetMax !== null) params.push(`priceH=${c.budgetMax}`);
  if (c.rooms !== null) params.push(`room=${c.rooms}`);
  if (params.length === 0) return null;
  return `https://sale.591.com.tw/?${params.join("&")}`;
}

/** 信義房屋 — region-only URL is reliable; price/room slugs aren't documented. */
function buildSinyi(c: SearchCriteria): string | null {
  const hit = firstKnownDistrict(c.districts);
  if (!hit) return "https://www.sinyi.com.tw/buy/list/Taipei-city";
  const cityPath = hit.meta.region === "台北市" ? "Taipei-city" : "NewTaipei-city";
  // Sinyi accepts <district>-<region> slugs for some districts. Fall back to
  // city-wide listing when the district slug isn't a safe bet.
  return `https://www.sinyi.com.tw/buy/list/${encodeURIComponent(hit.name)}-${cityPath}`;
}

/** 永慶房屋 — uses Chinese district names in the path. */
function buildYungching(c: SearchCriteria): string | null {
  const hit = firstKnownDistrict(c.districts);
  if (!hit) return "https://buy.yungching.com.tw/";
  return `https://buy.yungching.com.tw/list/${encodeURIComponent(hit.meta.region + "-" + hit.name)}_c/`;
}

/** 好房網 — region path. Price/room as query params is unreliable, skip. */
function buildHousefun(c: SearchCriteria): string | null {
  const hit = firstKnownDistrict(c.districts);
  if (!hit) return "https://buy.housefun.com.tw/";
  const cityPath = hit.meta.region === "台北市" ? "taipei-city" : "newtaipei-city";
  return `https://buy.housefun.com.tw/region/${cityPath}/${encodeURIComponent(hit.name)}/`;
}

export interface SearchLink {
  label: string;
  url: string;
}

export function buildSearchLinks(c: SearchCriteria): SearchLink[] {
  const links: SearchLink[] = [];
  const builders: Array<[string, (c: SearchCriteria) => string | null]> = [
    ["591", build591],
    ["信義房屋", buildSinyi],
    ["永慶房屋", buildYungching],
    ["好房網", buildHousefun],
  ];
  for (const [label, fn] of builders) {
    const url = fn(c);
    if (url) links.push({ label, url });
  }
  return links;
}

/** Render the criteria as a short human-readable line for the Bot reply. */
export function formatCriteria(c: SearchCriteria): string {
  const parts: string[] = [];
  if (c.districts.length > 0) parts.push(c.districts.join("、"));
  if (c.budgetMin !== null && c.budgetMax !== null) {
    if (c.budgetMin === c.budgetMax) parts.push(`${c.budgetMin} 萬`);
    else parts.push(`${c.budgetMin}-${c.budgetMax} 萬`);
  } else if (c.budgetMax !== null) {
    parts.push(`${c.budgetMax} 萬以內`);
  } else if (c.budgetMin !== null) {
    parts.push(`${c.budgetMin} 萬以上`);
  }
  if (c.rooms !== null) {
    const roomZh: Record<number, string> = {
      1: "一房", 2: "兩房", 3: "三房", 4: "四房", 5: "五房",
    };
    parts.push(roomZh[c.rooms] ?? `${c.rooms} 房`);
  }
  return parts.length > 0 ? parts.join(" / ") : "未指定條件";
}
