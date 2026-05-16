/**
 * Customer-facing AI: when a customer messages the bot, this generates the
 * reply they see. Distinct from the agent-side draft-reply (which wraps the
 * AI suggestion in "💬 建議回覆：…" for the agent to copy). Customers get
 * the reply directly, as if from the agent's assistant.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { chatComplete } from "@/lib/ai/minimax";

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

interface Hints {
  district: string | null;
  rooms: number | null;
  priceMin: number | null;
  priceMax: number | null;
}

function extractHints(text: string): Hints {
  let district: string | null = null;
  for (const d of DISTRICT_NAMES) {
    if (text.includes(d)) {
      district = `${d}區`;
      break;
    }
  }
  let rooms: number | null = null;
  for (const [w, n] of Object.entries(ROOM_WORDS)) {
    if (text.includes(w)) {
      rooms = n;
      break;
    }
  }
  let priceMin: number | null = null;
  let priceMax: number | null = null;
  const range = text.match(/(\d{2,5})\s*[-~到]\s*(\d{2,5})\s*萬/);
  const below = text.match(/(\d{2,5})\s*萬\s*(以內|以下)/);
  const above = text.match(/(\d{2,5})\s*萬\s*(以上)/);
  const single = text.match(/(\d{2,5})\s*萬/);
  if (range) {
    priceMin = Number(range[1]);
    priceMax = Number(range[2]);
  } else if (below) {
    priceMax = Number(below[1]);
  } else if (above) {
    priceMin = Number(above[1]);
  } else if (single) {
    const v = Number(single[1]);
    priceMin = Math.round(v * 0.85);
    priceMax = Math.round(v * 1.15);
  }
  return { district, rooms, priceMin, priceMax };
}

interface PropertyRow {
  title: string;
  district: string;
  price: number;
  rooms: number;
  status: string;
  area: number;
  address: string;
}

async function findAgentProperties(
  agentUserId: string,
  hints: Hints,
): Promise<PropertyRow[]> {
  const admin = createAdminClient();
  let q = admin
    .from("properties")
    .select("title,district,price,rooms,status,area,address")
    .eq("owner_id", agentUserId)
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
    console.error("[customer-ai] property lookup:", error.message);
    return [];
  }
  return (data ?? []) as PropertyRow[];
}

function formatProperty(p: PropertyRow): string {
  const parts = [`「${p.title}」`, p.district, `${p.price}萬`];
  if (p.rooms > 0) parts.push(`${p.rooms}房`);
  if (p.area > 0) parts.push(`${p.area}坪`);
  return parts.join(" / ");
}

function systemPrompt(agentName: string): string {
  return `你是 ${agentName} 的 AI 房仲助手，正在透過 LINE 跟客人對話。

【規則】
- 用繁體中文、自然口語、親切禮貌，稱呼客人用「您」，提到房仲用「${agentName}」。
- 1-3 句話，總長不超過 100 字。
- 適量使用 emoji（1-2 個，不要太多）。
- 結尾要有「下一步行動」：例如「方便幫您安排看屋嗎？」「要不要先留下您的需求？」「請 ${agentName} 直接撥電話給您嗎？」
- 不要寫稱謂（XX先生/小姐）、不要寫署名、不要寫「以下是回覆」之類的前置語。
- 只輸出對話內容本身，不要加引號或 markdown。
- 不報價、不討論議價空間、不承諾「絕對最低價」這種敏感話術 — 這些一律引導「請 ${agentName} 親自跟您說明」。
- 若客人問的物件在清單裡，引用名稱 / 區域 / 價格 / 房型；不在清單裡，誠實說沒這個物件 + 問需求方便推薦。
- 如果問題明顯需要房仲介入（議價、約看時間、貸款細節、敏感問題），先安撫客人並說「會請 ${agentName} 親自回覆您」。`;
}

function buildUserPrompt(customerText: string, props: PropertyRow[]): string {
  const matchedBlock =
    props.length === 0
      ? "（沒有符合條件的物件）"
      : props.map((p, i) => `${i + 1}. ${formatProperty(p)} / 狀態：${p.status}`).join("\n");
  return `客人問：${customerText}\n\n業務目前在案的相關物件：\n${matchedBlock}\n\n請以助手身份直接回覆客人：`;
}

const FALLBACK = "了解，我幫您記下了 🙏 方便先請您留下方便聯絡的時段嗎？我請業務跟您聯絡。";

export interface CustomerReplyResult {
  text: string;
  matchedProperties: number;
}

export async function generateCustomerReply(opts: {
  agentUserId: string;
  agentName: string;
  customerText: string;
}): Promise<CustomerReplyResult> {
  const hints = extractHints(opts.customerText);
  const properties = await findAgentProperties(opts.agentUserId, hints);

  let text: string;
  try {
    const { text: completion } = await chatComplete({
      messages: [
        { role: "system", content: systemPrompt(opts.agentName) },
        {
          role: "user",
          content: buildUserPrompt(opts.customerText, properties),
        },
      ],
      temperature: 0.5,
      maxTokens: 300,
      timeoutMs: 9000,
    });
    text =
      completion
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .replace(/^[\s"「『]+|[\s"」』]+$/g, "")
        .trim() || FALLBACK;
  } catch (err) {
    console.error("[customer-ai] MiniMax failed:", err);
    text = FALLBACK;
  }

  return { text, matchedProperties: properties.length };
}
