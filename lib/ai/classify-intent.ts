import { chatComplete, extractJson } from "./minimax";
import type { ClientDraft } from "./parse-client";

export interface ReminderDraft {
  title: string;
  remind_at_iso: string | null; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  remind_at_phrase: string;
  target_client_name: string | null;
}

export interface InteractionDraft {
  client_name_hint: string;
  type: "電話" | "帶看" | "LINE" | "成交" | "其他";
  note: string;
  property_hint: string | null;
}

export interface EditClientDraft {
  client_name_hint: string;
  patch: {
    budget_min: number | null;
    budget_max: number | null;
    districts: string[] | null;
    room_type: string | null;
    status:
      | "新客戶"
      | "追蹤中"
      | "帶看"
      | "議價"
      | "成交"
      | "流失"
      | null;
    requirements: string | null;
  };
}

export interface PropertyDraft {
  title: string | null;
  address: string | null;
  district: string | null;
  price: number | null; // 萬元
  type: "買賣" | "租賃" | null;
  status:
    | "委託中"
    | "帶看中"
    | "議價中"
    | "成交"
    | "解除委託"
    | null;
  rooms: number | null;
  bathrooms: number | null;
  area: number | null; // 坪
  description: string;
}

export interface SearchPropertyDraft {
  districts: string[];
  budget_min: number | null;
  budget_max: number | null;
  rooms: number | null;
  notes: string;
}

export type IntentResult =
  | { intent: "client"; data: ClientDraft }
  | { intent: "reminder"; data: ReminderDraft }
  | { intent: "interaction"; data: InteractionDraft }
  | { intent: "edit_client"; data: EditClientDraft }
  | { intent: "create_property"; data: PropertyDraft }
  | { intent: "search_property"; data: SearchPropertyDraft }
  | { intent: "today_tasks"; data: Record<string, never> }
  | { intent: "unknown"; data: { reason: string } };

const INTERACTION_TYPES = ["電話", "帶看", "LINE", "成交", "其他"] as const;
const CLIENT_STATUSES = [
  "新客戶",
  "追蹤中",
  "帶看",
  "議價",
  "成交",
  "流失",
] as const;

function todayTaipei(): string {
  return new Intl.DateTimeFormat("zh-Hant-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, "-");
}

function systemPrompt(today: string): string {
  return `你是房仲業務助手 LeadFlow 的訊息分類器。判斷使用者意圖，並抽取對應資料。

【意圖】
- "client": 描述新客戶（含姓名 + 預算 / 區域 / 房型 等買賣需求）
- "edit_client": 修改既有客戶資料（例「改王先生預算 3500」「林小姐改成議價中」「王俊豪偏好區域加大安」）
- "reminder": 要建立提醒（含時間 + 動作，例「提醒我下週三聯絡王先生」）
- "interaction": 記錄已發生的互動（已知客戶 + 動作 + 反饋，例「今天帶林小姐看大安的房，她覺得太貴」）
- "create_property": 建立新物件（房仲自己接到的委託，例「新物件 大安森林公園旁 三房 4280 萬」「委託 信義計畫區豪邸 5980 萬 議價中」）
- "search_property": 替客戶找物件（沒有客戶姓名，只有需求條件，例「幫我找信義區 3000 萬以內三房」「客人要大安兩房 2000 萬以內，要捷運站附近」）
- "today_tasks": 詢問今日待辦（例「今天有什麼事」、「今日任務」、「今天該做什麼」）
- "unknown": 無法歸類或資訊不足

【時間】當前日期（Asia/Taipei）：${today}。相對時間（明天、下週三、5/21、後天下午 3 點）以這個日期換算成 ISO「YYYY-MM-DD」或「YYYY-MM-DDTHH:mm」。無法判斷就放 null。

【金額】單位「萬元」。「3000 萬」→ 3000；「1.2 億」→ 12000；「3000-3500 萬」→ budget_min=3000, budget_max=3500。

【輸出規則】
- 只輸出單一 JSON 物件，無說明、無 markdown fence、無 <think> 標籤。
- 第一個字必須是 {，最後一個字必須是 }。

【JSON schema 依 intent 分歧】

intent="client":
{
  "intent": "client",
  "data": {
    "name": string | null,
    "phone": string | null,
    "line_id": string | null,
    "type": "買方" | "賣方" | "租客" | "房東" | null,
    "budget_min": number | null,
    "budget_max": number | null,
    "districts": string[],
    "room_type": string | null,
    "notes": string
  }
}

intent="reminder":
{
  "intent": "reminder",
  "data": {
    "title": string,                       // 提醒主旨，例「聯絡王先生」
    "remind_at_iso": string | null,        // 例「2026-05-21」或「2026-05-21T15:00」
    "remind_at_phrase": string,            // 原文時間描述
    "target_client_name": string | null    // 牽涉客戶時填，例「王先生」
  }
}

intent="interaction":
{
  "intent": "interaction",
  "data": {
    "client_name_hint": string,            // 客戶姓名線索
    "type": "電話" | "帶看" | "LINE" | "成交" | "其他",
    "note": string,
    "property_hint": string | null
  }
}

intent="edit_client":
{
  "intent": "edit_client",
  "data": {
    "client_name_hint": string,                       // 要修改的客戶
    "patch": {
      "budget_min": number | null,                    // 萬元，只在使用者提到預算時填
      "budget_max": number | null,                    // 同上；單一數字填 budget_min=budget_max
      "districts": string[] | null,                   // 完整覆蓋；不要 partial（「加大安」也整組填）
      "room_type": string | null,
      "status": "新客戶" | "追蹤中" | "帶看" | "議價" | "成交" | "流失" | null,
      "requirements": string | null
    }
  }
}
（patch 內未提及的欄位一律 null，不要硬填。）

intent="create_property":
{
  "intent": "create_property",
  "data": {
    "title": string | null,              // 物件名稱，例「大安森林公園旁三房」
    "address": string | null,            // 完整地址，沒提就 null
    "district": string | null,           // 行政區
    "price": number | null,              // 萬元
    "type": "買賣" | "租賃" | null,
    "status": "委託中" | "帶看中" | "議價中" | "成交" | "解除委託" | null,
    "rooms": number | null,
    "bathrooms": number | null,
    "area": number | null,               // 坪數
    "description": string                // 其他說明，沒有就空字串
  }
}

intent="search_property":
{
  "intent": "search_property",
  "data": {
    "districts": string[],
    "budget_min": number | null,
    "budget_max": number | null,
    "rooms": number | null,
    "notes": string
  }
}

intent="today_tasks":
{ "intent": "today_tasks", "data": {} }

intent="unknown":
{ "intent": "unknown", "data": { "reason": string } }`;
}

const ALLOWED_CLIENT_TYPES = new Set(["買方", "賣方", "租客", "房東"]);

function sanitizeClient(raw: Record<string, unknown>): ClientDraft {
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  const str = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s ? s : null;
  };
  const typeRaw = str(raw.type);
  const type =
    typeRaw && ALLOWED_CLIENT_TYPES.has(typeRaw)
      ? (typeRaw as ClientDraft["type"])
      : null;
  const districts = Array.isArray(raw.districts)
    ? raw.districts
        .map((d) => (typeof d === "string" ? d.trim() : ""))
        .filter((d): d is string => d.length > 0)
    : [];
  let min = num(raw.budget_min);
  let max = num(raw.budget_max);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  return {
    name: str(raw.name),
    phone: str(raw.phone),
    line_id: str(raw.line_id),
    type,
    budget_min: min,
    budget_max: max,
    districts,
    room_type: str(raw.room_type),
    notes: typeof raw.notes === "string" ? raw.notes.trim() : "",
  };
}

function sanitizeReminder(raw: Record<string, unknown>): ReminderDraft | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) return null;
  const iso = typeof raw.remind_at_iso === "string" ? raw.remind_at_iso.trim() : "";
  let validIso: string | null = null;
  if (iso) {
    // Accept YYYY-MM-DD or YYYY-MM-DDTHH:mm or full ISO
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(iso)) {
      validIso = iso;
    }
  }
  return {
    title,
    remind_at_iso: validIso,
    remind_at_phrase:
      typeof raw.remind_at_phrase === "string" ? raw.remind_at_phrase.trim() : "",
    target_client_name:
      typeof raw.target_client_name === "string" && raw.target_client_name.trim()
        ? raw.target_client_name.trim()
        : null,
  };
}

function sanitizeEditClient(raw: Record<string, unknown>): EditClientDraft | null {
  const hint =
    typeof raw.client_name_hint === "string" ? raw.client_name_hint.trim() : "";
  if (!hint) return null;
  const patchRaw =
    (raw.patch as Record<string, unknown> | undefined) ?? {};

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  const str = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s ? s : null;
  };

  let min = num(patchRaw.budget_min);
  let max = num(patchRaw.budget_max);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  const districtsRaw = patchRaw.districts;
  const districts = Array.isArray(districtsRaw)
    ? districtsRaw
        .map((d) => (typeof d === "string" ? d.trim() : ""))
        .filter((d): d is string => d.length > 0)
    : null;

  const statusStr = str(patchRaw.status);
  const status =
    statusStr && (CLIENT_STATUSES as readonly string[]).includes(statusStr)
      ? (statusStr as EditClientDraft["patch"]["status"])
      : null;

  const patch: EditClientDraft["patch"] = {
    budget_min: min,
    budget_max: max,
    districts: districts && districts.length > 0 ? districts : null,
    room_type: str(patchRaw.room_type),
    status,
    requirements: str(patchRaw.requirements),
  };

  // Reject if the patch is empty — model should fall back to "unknown" instead.
  const hasAnything =
    patch.budget_min !== null ||
    patch.budget_max !== null ||
    patch.districts !== null ||
    patch.room_type !== null ||
    patch.status !== null ||
    patch.requirements !== null;
  if (!hasAnything) return null;

  return { client_name_hint: hint, patch };
}

const ALLOWED_PROPERTY_TYPES = new Set(["買賣", "租賃"]);
const ALLOWED_PROPERTY_STATUSES = new Set([
  "委託中",
  "帶看中",
  "議價中",
  "成交",
  "解除委託",
]);

function sanitizePropertyDraft(raw: Record<string, unknown>): PropertyDraft {
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  };
  const intNum = (v: unknown): number | null => {
    const n = num(v);
    return n === null ? null : Math.round(n);
  };
  const str = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s ? s : null;
  };
  const typeRaw = str(raw.type);
  const statusRaw = str(raw.status);
  // Defensive: if the model returned raw NTD (e.g. 42_800_000 for 4280萬)
  // instead of 萬元, convert. Threshold = 100k 萬 = 10 億; nothing legitimate
  // is that big in 萬元 units.
  let priceRaw = intNum(raw.price);
  if (priceRaw !== null && priceRaw > 100000) priceRaw = Math.round(priceRaw / 10000);

  // Models sometimes ignore type+status enum: when `type` looks like 三房 /
  // 兩房 (i.e. room layout), it isn't 買賣/租賃 — treat that as the title
  // hint and clear the type field. Same for status fallback.
  const looksLikeRoomLayout = typeRaw && /[一二三四五六1-9]房/.test(typeRaw);
  const cleanType =
    typeRaw && !looksLikeRoomLayout && ALLOWED_PROPERTY_TYPES.has(typeRaw)
      ? (typeRaw as PropertyDraft["type"])
      : null;

  // Some responses use "location" instead of "district".
  const districtRaw =
    str(raw.district) ??
    str((raw as Record<string, unknown>).location) ??
    null;
  // Some responses use "name" instead of "title".
  const titleRaw =
    str(raw.title) ??
    str((raw as Record<string, unknown>).name) ??
    str((raw as Record<string, unknown>).location);

  return {
    title: titleRaw,
    address: str(raw.address),
    district: districtRaw,
    price: priceRaw,
    type: cleanType,
    status:
      statusRaw && ALLOWED_PROPERTY_STATUSES.has(statusRaw)
        ? (statusRaw as PropertyDraft["status"])
        : null,
    rooms: intNum(raw.rooms),
    bathrooms: intNum(raw.bathrooms),
    area: num(raw.area),
    description: typeof raw.description === "string" ? raw.description.trim() : "",
  };
}

function sanitizeSearchProperty(raw: Record<string, unknown>): SearchPropertyDraft {
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  const districts = Array.isArray(raw.districts)
    ? raw.districts
        .map((d) => (typeof d === "string" ? d.trim() : ""))
        .filter((d): d is string => d.length > 0)
    : [];
  let min = num(raw.budget_min);
  let max = num(raw.budget_max);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  return {
    districts,
    budget_min: min,
    budget_max: max,
    rooms: num(raw.rooms),
    notes: typeof raw.notes === "string" ? raw.notes.trim() : "",
  };
}

function sanitizeInteraction(
  raw: Record<string, unknown>,
): InteractionDraft | null {
  const hint =
    typeof raw.client_name_hint === "string" ? raw.client_name_hint.trim() : "";
  if (!hint) return null;
  const typeRaw = typeof raw.type === "string" ? raw.type.trim() : "";
  const type = (INTERACTION_TYPES as readonly string[]).includes(typeRaw)
    ? (typeRaw as InteractionDraft["type"])
    : "其他";
  return {
    client_name_hint: hint,
    type,
    note: typeof raw.note === "string" ? raw.note.trim() : "",
    property_hint:
      typeof raw.property_hint === "string" && raw.property_hint.trim()
        ? raw.property_hint.trim()
        : null,
  };
}

export async function classifyIntentAndExtract(
  text: string,
): Promise<IntentResult | null> {
  const today = todayTaipei();
  const { text: completion } = await chatComplete({
    messages: [
      { role: "system", content: systemPrompt(today) },
      { role: "user", content: text },
    ],
    temperature: 0.1,
    maxTokens: 900,
    timeoutMs: 9000,
  });

  const raw = extractJson<{ intent?: unknown; data?: unknown }>(completion);
  if (!raw || typeof raw.intent !== "string") return null;

  const data = (raw.data as Record<string, unknown>) ?? {};

  switch (raw.intent) {
    case "client": {
      const sanitized = sanitizeClient(data);
      if (!sanitized.name) return { intent: "unknown", data: { reason: "missing name" } };
      return { intent: "client", data: sanitized };
    }
    case "reminder": {
      const sanitized = sanitizeReminder(data);
      if (!sanitized) return { intent: "unknown", data: { reason: "missing title" } };
      return { intent: "reminder", data: sanitized };
    }
    case "interaction": {
      const sanitized = sanitizeInteraction(data);
      if (!sanitized) return { intent: "unknown", data: { reason: "missing client_name_hint" } };
      return { intent: "interaction", data: sanitized };
    }
    case "edit_client": {
      const sanitized = sanitizeEditClient(data);
      if (!sanitized) return { intent: "unknown", data: { reason: "empty patch" } };
      return { intent: "edit_client", data: sanitized };
    }
    case "create_property": {
      // Model sometimes returns the property fields under "property" instead
      // of "data" — peek both before sanitising.
      const propData =
        (raw as { property?: Record<string, unknown> }).property ?? data;
      const sanitized = sanitizePropertyDraft(propData);
      if (!sanitized.title) {
        return { intent: "unknown", data: { reason: "missing property title" } };
      }
      return { intent: "create_property", data: sanitized };
    }
    case "search_property": {
      return { intent: "search_property", data: sanitizeSearchProperty(data) };
    }
    case "today_tasks":
      return { intent: "today_tasks", data: {} };
    case "unknown":
      return {
        intent: "unknown",
        data: {
          reason: typeof data.reason === "string" ? data.reason : "unknown",
        },
      };
    default:
      return null;
  }
}
