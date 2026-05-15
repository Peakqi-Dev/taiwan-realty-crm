import { chatComplete, extractJson } from "./minimax";

export interface ClientDraft {
  name: string | null;
  phone: string | null;
  line_id: string | null;
  type: "買方" | "賣方" | "租客" | "房東" | null;
  budget_min: number | null; // 萬元
  budget_max: number | null; // 萬元
  districts: string[];
  room_type: string | null; // e.g. "三房"
  notes: string;
}

const SYSTEM_PROMPT = `你是房仲業務助手 LeadFlow 的資訊抽取模組，把口語化的客戶資訊轉成結構化 JSON。

【輸出規則】
- **只輸出單一 JSON 物件**，第一個字元必須是 {，最後一個字元必須是 }。
- **絕對不要** 任何說明、推理過程、<think> 標籤、markdown fence 或前後文字。

【內容規則】
- 金額單位是「萬元」。例：「3000 萬」→ 3000；「1.2 億」→ 12000；「3000-3500 萬」→ budget_min=3000, budget_max=3500。
- 月租型輸入（例「月租 25-40 千」）以「萬元」單位填，例 25 千 = 2.5；若資訊不明就放 null。
- 找不到的欄位放 null（陣列放 []）。不要硬猜。
- districts 用台北市/新北市標準行政區名（信義區、大安區、中山區...）。
- type 從固定四個值選一個：「買方」「賣方」「租客」「房東」；推斷不出來就 null。

【JSON schema】
{
  "name": string | null,
  "phone": string | null,
  "line_id": string | null,
  "type": "買方" | "賣方" | "租客" | "房東" | null,
  "budget_min": number | null,
  "budget_max": number | null,
  "districts": string[],
  "room_type": string | null,
  "notes": string
}`;

const USER_TEMPLATE = (text: string) =>
  `房仲傳來的客戶資訊：\n\n${text}\n\n回 JSON 物件，遵守上述 schema 與規則。`;

const ALLOWED_TYPES = new Set(["買方", "賣方", "租客", "房東"]);

function sanitize(raw: Record<string, unknown>): ClientDraft {
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
    typeRaw && ALLOWED_TYPES.has(typeRaw)
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

export async function parseClientDraft(text: string): Promise<ClientDraft | null> {
  const { text: completion } = await chatComplete({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_TEMPLATE(text) },
    ],
    temperature: 0.1,
    maxTokens: 400,
    timeoutMs: 8000,
  });

  const json = extractJson<Record<string, unknown>>(completion);
  if (!json) return null;
  return sanitize(json);
}

/**
 * Apply an incremental update from a "改 X Y" instruction.
 * Re-uses the same parser to produce a patch and merges non-null fields onto
 * the existing draft. Falls back to no-op on parse failure.
 */
export async function patchClientDraft(
  current: ClientDraft,
  instruction: string,
): Promise<ClientDraft> {
  const patch = await parseClientDraft(instruction);
  if (!patch) return current;
  return {
    name: patch.name ?? current.name,
    phone: patch.phone ?? current.phone,
    line_id: patch.line_id ?? current.line_id,
    type: patch.type ?? current.type,
    budget_min: patch.budget_min ?? current.budget_min,
    budget_max: patch.budget_max ?? current.budget_max,
    districts: patch.districts.length > 0 ? patch.districts : current.districts,
    room_type: patch.room_type ?? current.room_type,
    notes: patch.notes || current.notes,
  };
}

/** Human-readable summary of the draft for the LINE confirm message. */
export function formatDraftForConfirm(draft: ClientDraft): string {
  const lines: string[] = ["建檔："];
  lines.push(`• 客戶：${draft.name ?? "（未填）"}`);
  if (draft.phone) lines.push(`• 電話：${draft.phone}`);
  if (draft.type) lines.push(`• 類型：${draft.type}`);
  if (draft.budget_min !== null || draft.budget_max !== null) {
    if (draft.budget_min === draft.budget_max && draft.budget_min !== null) {
      lines.push(`• 預算：${draft.budget_min} 萬`);
    } else {
      const lo = draft.budget_min ?? "?";
      const hi = draft.budget_max ?? "?";
      lines.push(`• 預算：${lo}-${hi} 萬`);
    }
  }
  if (draft.districts.length > 0)
    lines.push(`• 區域：${draft.districts.join("、")}`);
  if (draft.room_type) lines.push(`• 房型：${draft.room_type}`);
  if (draft.notes) lines.push(`• 備註：${draft.notes}`);
  lines.push("");
  lines.push("回「對」確認建檔，或回「改 預算 2500」這樣調整。");
  return lines.join("\n");
}
