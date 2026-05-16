/**
 * Generates a polished LINE reply suggestion for the agent to send to their
 * customer. Looks up matching properties in the agent's DB, then asks
 * MiniMax to draft a 1-3 sentence professional response.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { chatComplete } from "@/lib/ai/minimax";
import type { DraftReplyHints, DraftReplyRequest } from "@/lib/ai/parse-draft-reply";

interface PropertyRow {
  title: string;
  district: string;
  price: number;
  rooms: number;
  status: string;
  area: number;
}

async function findMatchingProperties(
  ownerUserId: string,
  hints: DraftReplyHints,
): Promise<PropertyRow[]> {
  const admin = createAdminClient();
  let q = admin
    .from("properties")
    .select("title,district,price,rooms,status,area")
    .eq("owner_id", ownerUserId)
    .neq("status", "成交")
    .neq("status", "解除委託")
    .order("created_at", { ascending: false })
    .limit(5);

  if (hints.district) q = q.eq("district", hints.district);
  if (hints.rooms !== null) q = q.eq("rooms", hints.rooms);
  if (hints.priceMin !== null) q = q.gte("price", hints.priceMin);
  if (hints.priceMax !== null) q = q.lte("price", hints.priceMax);

  const { data, error } = await q;
  if (error) {
    console.error("[draft-reply] property lookup failed:", error.message);
    return [];
  }
  return (data ?? []) as PropertyRow[];
}

function formatPropertyForContext(p: PropertyRow): string {
  const parts = [`「${p.title}」`, `${p.district}`, `${p.price} 萬`, `${p.rooms} 房`];
  if (p.area > 0) parts.push(`${p.area} 坪`);
  parts.push(`狀態：${p.status}`);
  return parts.join(" / ");
}

function systemPrompt(): string {
  return `你是台灣資深房仲，協助房仲業務擬一段給客戶的 LINE 回覆。

【規則】
- 用繁體中文、口語、禮貌，稱呼用「您」。
- 1-3 句話，總長不超過 80 字。
- 適量使用 emoji（1-2 個就好，不要太多）。
- 結尾要有「下一步行動提示」，例如：要不要約看 / 我直接傳資料給您 / 方便晚上撥個電話聊嗎。
- 不要寫稱謂（XX先生/小姐）、不要寫署名、不要寫「以下是回覆內容」之類的前置語。
- 只輸出回覆本身，不要加引號、不要加 markdown、不要加說明。
- 若有匹配物件就引用其名稱與重點（價格 / 房型 / 狀態）；沒有匹配物件就誠實回應、引導留下需求。`;
}

function buildUserPrompt(question: string, matches: PropertyRow[]): string {
  const matchedBlock =
    matches.length === 0
      ? "（你的物件清單中沒有條件相符的物件）"
      : matches.map((p, i) => `${i + 1}. ${formatPropertyForContext(p)}`).join("\n");
  return `客戶 LINE 訊息：${question}\n\n你目前的相關物件：\n${matchedBlock}\n\n請草擬回覆：`;
}

const REPLY_FOOTER = "\n\n長按上面的文字就能複製 👆";

/**
 * Generate the draft reply text. Returns the full LINE-ready message
 * including the "💬 建議回覆：..." header and copy hint footer.
 */
export async function buildDraftReply(
  ownerUserId: string,
  req: DraftReplyRequest,
): Promise<string> {
  const matches = await findMatchingProperties(ownerUserId, req.hints);

  const { text: completion } = await chatComplete({
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: buildUserPrompt(req.question, matches) },
    ],
    temperature: 0.5,
    maxTokens: 300,
    timeoutMs: 9000,
  });

  // Strip any <think>…</think> blocks and leading/trailing whitespace.
  const cleaned = completion
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/^[\s"「『]+|[\s"」』]+$/g, "")
    .trim();

  const body = cleaned || "目前還在幫您確認最新狀態，我等等回覆您 🙏 方便先告訴我預算範圍嗎？";

  return `💬 建議回覆：\n${body}${REPLY_FOOTER}`;
}
