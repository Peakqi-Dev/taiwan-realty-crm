import { NextResponse } from "next/server";
import { lineEnv } from "@/lib/line/env";
import { verifyLineSignature } from "@/lib/line/signature";
import {
  replyMessage,
  pushMessage,
  startLoadingAnimation,
  textMessage,
  getProfile,
  type LineMessage,
} from "@/lib/line/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoOnboardLineUser } from "@/lib/line/auto-onboard";
import {
  patchClientDraft,
  formatDraftForConfirm,
} from "@/lib/ai/parse-client";
import { classifyIntentAndExtract } from "@/lib/ai/classify-intent";
import {
  getActiveDraft,
  setDraft,
  clearDraft,
  setAwaitingFeedback,
  isAwaitingFeedback,
  clearAwaitingFeedback,
} from "@/lib/line/pending";
import { saveFeedback } from "@/lib/line/feedback";
import { tutorialText, TUTORIAL_QUICK_REPLIES } from "@/lib/line/tutorial";
import { classifyIntent } from "@/lib/line/intent";
import { parseSearchByRegex } from "@/lib/ai/parse-search";
import {
  buildSearchLinks,
  formatCriteria,
  type SearchCriteria,
} from "@/lib/line/property-search";
import { commitClientDraft } from "@/lib/line/commit-client";
import { commitReminder } from "@/lib/line/commit-reminder";
import {
  matchClientsByHint,
  commitInteraction,
} from "@/lib/line/commit-interaction";
import {
  commitEditClient,
  formatPatchSummary,
} from "@/lib/line/commit-edit-client";
import { buildDailyBrief } from "@/lib/line/daily-brief";

/* eslint-disable @typescript-eslint/no-explicit-any */

// LINE webhook payload shapes (only fields we use).
interface LineSource {
  type: "user" | "group" | "room";
  userId?: string;
}

interface LineFollowEvent {
  type: "follow";
  replyToken: string;
  source: LineSource;
}

interface LineUnfollowEvent {
  type: "unfollow";
  source: LineSource;
}

interface LineMessageEvent {
  type: "message";
  replyToken: string;
  source: LineSource;
  message: { type: "text"; text: string } | { type: string };
}

type LineEvent = LineFollowEvent | LineUnfollowEvent | LineMessageEvent | { type: string };

export const dynamic = "force-dynamic";

const BUSY_MESSAGE = "AI 暫時有點忙，請稍後再試 🙏";

export async function POST(request: Request) {
  const { channelSecret, channelAccessToken, liffUrl } = lineEnv();

  if (!channelSecret || !channelAccessToken) {
    console.warn(
      "[LINE webhook] missing LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN — skipping",
    );
    return NextResponse.json({ ok: true, skipped: "not_configured" });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    console.warn("[LINE webhook] signature mismatch");
    return new NextResponse("invalid signature", { status: 401 });
  }

  let payload: { events?: LineEvent[] };
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[LINE webhook] bad JSON:", err);
    return new NextResponse("bad json", { status: 400 });
  }

  const events = payload.events ?? [];
  await Promise.all(
    events.map((e) => handleEvent(e, channelAccessToken, liffUrl)),
  );

  return NextResponse.json({ ok: true, processed: events.length });
}

async function handleEvent(
  event: LineEvent,
  accessToken: string,
  liffUrl: string | null,
) {
  try {
    if (event.type === "follow") {
      await onFollow(event as LineFollowEvent, accessToken, liffUrl);
      return;
    }
    if (event.type === "unfollow") {
      await onUnfollow(event as LineUnfollowEvent);
      return;
    }
    if (event.type === "message") {
      await onMessage(event as LineMessageEvent, accessToken);
      return;
    }
  } catch (err: any) {
    console.error(`[LINE webhook] event ${event.type} failed:`, err?.message ?? err);
  }
}

async function onFollow(
  event: LineFollowEvent,
  accessToken: string,
  liffUrl: string | null,
) {
  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  const profile = await getProfile(accessToken, lineUserId);
  const displayName = profile?.displayName || "LINE 用戶";

  try {
    await autoOnboardLineUser(lineUserId, displayName);
  } catch (err) {
    console.error("[LINE webhook] auto-onboard failed:", err);
    await replyMessage(accessToken, event.replyToken, [
      textMessage("👋 歡迎！系統正在配置中，請稍後再對我講話。"),
    ]);
    return;
  }

  // Single-message welcome: text + plain URL (LINE auto-renders preview).
  // Skips the buttonsTemplate to keep the welcome at 1 outbound message.
  const liffLine = liffUrl ? `\n\n想看完整資料 → ${liffUrl}` : "";
  const messages: LineMessage[] = [
    textMessage(
      `👋 ${displayName}，我是 LeadFlow，你的 AI 房仲業務助手。\n你的帳號已經建好了！\n\n跟我講一句話就能建檔，試試看 👇\n\n${tutorialText()}\n\n現在就試試，跟我說你的第一個客戶！${liffLine}`,
      TUTORIAL_QUICK_REPLIES,
    ),
  ];
  await replyMessage(accessToken, event.replyToken, messages);
}

async function onUnfollow(event: LineUnfollowEvent) {
  const lineUserId = event.source.userId;
  if (!lineUserId) return;
  const admin = createAdminClient();
  await admin
    .from("line_bindings")
    .update({ unbound_at: new Date().toISOString() })
    .eq("line_user_id", lineUserId);
}

async function onMessage(event: LineMessageEvent, accessToken: string) {
  if (event.message.type !== "text") return;
  const lineUserId = event.source.userId;
  if (!lineUserId) return;
  const text = (event.message as { type: "text"; text: string }).text;

  const admin = createAdminClient();
  const { data: binding } = await admin
    .from("line_bindings")
    .select("user_id, unbound_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  // Auto-recover: user messaging us but no active binding (e.g. webhook
  // delivered the message before the follow event, or admin manually
  // unbound). Re-onboard inline so the conversation continues.
  if (!binding || binding.unbound_at) {
    const profile = await getProfile(accessToken, lineUserId);
    const displayName = profile?.displayName || "LINE 用戶";
    try {
      await autoOnboardLineUser(lineUserId, displayName);
    } catch (err) {
      console.error("[LINE webhook] re-onboard failed:", err);
      await replyMessage(accessToken, event.replyToken, [
        textMessage("系統忙線中，請稍後再試一次 🙏"),
      ]);
      return;
    }
    await replyMessage(accessToken, event.replyToken, [
      textMessage(
        `${displayName} 你好，帳號剛幫你建好了。再傳一次客戶資訊就會自動建檔 👇`,
      ),
    ]);
    return;
  }

  const ownerUserId = binding.user_id as string;

  // Awaiting-feedback flow: the user clicked 「意見回饋」 last; this message is the feedback.
  if (await isAwaitingFeedback(lineUserId)) {
    const trimmed = text.trim();
    if (trimmed) {
      await saveFeedback(lineUserId, trimmed);
      await clearAwaitingFeedback(lineUserId);
      await replyMessage(accessToken, event.replyToken, [
        textMessage(
          "謝謝你的回饋 🙏 我會轉給團隊。\n\n要繼續用嗎？直接跟我講下一個客戶或操作就行。",
          TUTORIAL_QUICK_REPLIES,
        ),
      ]);
      return;
    }
    await clearAwaitingFeedback(lineUserId);
  }

  // Fast paths — instant reply, no AI.
  if (text === "新增客戶") {
    await replyMessage(accessToken, event.replyToken, [
      textMessage(
        '直接傳客戶資訊給我，例如：\n「王先生 3000 萬 信義區 三房」\n或加上電話：\n「林小姐 0912-345-678 大安區或中山區 兩房 預算 2500-3000 萬」',
      ),
    ]);
    return;
  }
  if (text === "今日任務") {
    try {
      const brief = await buildDailyBrief(ownerUserId);
      await replyMessage(accessToken, event.replyToken, [
        textMessage(brief.text),
      ]);
    } catch (err) {
      console.error("[LINE webhook] daily brief failed:", err);
      await replyMessage(accessToken, event.replyToken, [
        textMessage(BUSY_MESSAGE),
      ]);
    }
    return;
  }

  if (text === "使用教學") {
    await replyMessage(accessToken, event.replyToken, [
      textMessage(
        `${tutorialText()}\n\n直接點下面試試看 👇`,
        TUTORIAL_QUICK_REPLIES,
      ),
    ]);
    return;
  }

  if (text === "意見回饋") {
    await setAwaitingFeedback(lineUserId);
    await replyMessage(accessToken, event.replyToken, [
      textMessage(
        "有任何建議或問題，直接跟我說，我會轉給團隊 🙏\n\n（下一則訊息我會當作意見回饋，5 分鐘內有效）",
      ),
    ]);
    return;
  }

  const pending = await getActiveDraft(lineUserId);
  const intent = classifyIntent(text);

  // Fast path: "today" queries skip AI to stay under LINE's 10s webhook
  // budget. Doesn't disturb a pending draft.
  if (intent.kind === "today_tasks") {
    try {
      const brief = await buildDailyBrief(ownerUserId);
      await replyMessage(accessToken, event.replyToken, [
        textMessage(brief.text),
      ]);
    } catch (err) {
      console.error("[LINE webhook] daily brief failed:", err);
      await replyMessage(accessToken, event.replyToken, [
        textMessage(BUSY_MESSAGE),
      ]);
    }
    return;
  }

  // Fast paths on the pending-draft branch.
  if (pending) {
    if (intent.kind === "confirm") {
      const result = await commitClientDraft(ownerUserId, pending);
      if (!result.ok) {
        await replyMessage(accessToken, event.replyToken, [
          textMessage(`建檔失敗：${result.error}`),
        ]);
        return;
      }
      await clearDraft(lineUserId);
      await replyMessage(accessToken, event.replyToken, [
        textMessage(
          `✅ 已建檔「${pending.name}」。\n打開 LeadFlow 看詳細：https://taiwan-realty-crm.vercel.app/clients/${result.clientId}`,
        ),
      ]);
      return;
    }
    if (intent.kind === "cancel") {
      await clearDraft(lineUserId);
      await replyMessage(accessToken, event.replyToken, [
        textMessage("已取消這筆建檔。"),
      ]);
      return;
    }
    if (intent.kind === "patch") {
      await runWithAck(
        accessToken,
        event.replyToken,
        lineUserId,
        async () => {
          const patched = await patchClientDraft(pending, intent.instruction);
          await setDraft(lineUserId, patched);
          return [textMessage(formatDraftForConfirm(patched))];
        },
      );
      return;
    }
    // freeform with pending → classifier path below
  } else if (intent.kind === "confirm" || intent.kind === "cancel") {
    await replyMessage(accessToken, event.replyToken, [
      textMessage(
        "目前沒有待確認的客戶資料。直接傳客戶資訊給我，例如：「王先生 3000 萬 信義區 三房」。",
      ),
    ]);
    return;
  }

  // Regex fast-path: simple property searches skip AI entirely.
  if (!pending) {
    const searchCriteria = parseSearchByRegex(text);
    if (searchCriteria) {
      await replyMessage(accessToken, event.replyToken, [
        buildSearchReply(searchCriteria),
      ]);
      return;
    }
  }

  // AI classifier path — heavy. Loading indicator + reply.
  await runWithAck(accessToken, event.replyToken, lineUserId, async () =>
    computeIntentMessages(text, lineUserId, ownerUserId),
  );
}

function buildSearchReply(criteria: SearchCriteria): LineMessage {
  const links = buildSearchLinks(criteria);
  const lines: string[] = [`🔍 搜尋：${formatCriteria(criteria)}`, ""];
  if (links.length > 0) {
    for (const link of links) lines.push(`👉 ${link.label}：${link.url}`);
    lines.push("");
    lines.push("找到適合的物件可以跟我說，我幫你記到客戶檔案裡。");
  } else {
    lines.push("這組條件目前還沒辦法產出搜尋連結，要不要再說一次區域或預算？");
  }
  return textMessage(lines.join("\n"));
}

/**
 * Run heavy work (AI), then REPLY with the result using the original reply
 * token. Replies are free; pushes count toward the LINE message quota, so
 * we keep the work inside the reply window.
 *
 * The user sees a typing indicator (loading animation, separate API, doesn't
 * count as a message) while we wait. Reply tokens are valid for ~60s, well
 * above our AI ceiling (~9s).
 */
async function runWithAck(
  accessToken: string,
  replyToken: string,
  lineUserId: string,
  work: () => Promise<LineMessage[]>,
) {
  // Fire-and-forget: show typing indicator. Failure is harmless.
  startLoadingAnimation(accessToken, lineUserId, 30).catch((err) => {
    console.warn("[LINE webhook] loading animation failed:", err);
  });

  let messages: LineMessage[] = [];
  try {
    messages = await work();
  } catch (err) {
    console.error("[LINE webhook] heavy work failed:", err);
    messages = [textMessage(BUSY_MESSAGE)];
  }

  if (messages.length > 0) {
    const replied = await replyMessage(accessToken, replyToken, messages);
    if (!replied.ok) {
      // Reply token may have expired (>60s) — fall back to push so the user
      // still gets the answer. Push DOES count toward quota.
      console.warn(
        "[LINE webhook] reply failed, falling back to push:",
        replied.status,
        replied.body ?? "",
      );
      await pushMessage(accessToken, lineUserId, messages).catch((err) => {
        console.error("[LINE webhook] push fallback failed:", err);
      });
    }
  }
}

// LINE webhook budget is 10s. Cap input so AI latency stays bounded — the
// extractor only needs a few hundred chars to fill the schema; anything
// beyond is usually filler text the model still has to read.
const AI_INPUT_MAX = 400;

async function computeIntentMessages(
  text: string,
  lineUserId: string,
  ownerUserId: string,
): Promise<LineMessage[]> {
  const trimmed = text.length > AI_INPUT_MAX ? text.slice(0, AI_INPUT_MAX) : text;
  const result = await classifyIntentAndExtract(trimmed);
  if (!result) return [unknownReply()];

  if (result.intent === "client") {
    await setDraft(lineUserId, result.data);
    return [textMessage(formatDraftForConfirm(result.data))];
  }

  if (result.intent === "today_tasks") {
    const brief = await buildDailyBrief(ownerUserId);
    return [textMessage(brief.text)];
  }

  if (result.intent === "search_property") {
    return [
      buildSearchReply({
        districts: result.data.districts,
        budgetMin: result.data.budget_min,
        budgetMax: result.data.budget_max,
        rooms: result.data.rooms,
        notes: result.data.notes,
      }),
    ];
  }

  if (result.intent === "reminder") {
    let targetClientId: string | null = null;
    if (result.data.target_client_name) {
      const { matches } = await matchClientsByHint(
        ownerUserId,
        result.data.target_client_name,
      );
      if (matches.length === 1) targetClientId = matches[0].id;
    }
    const committed = await commitReminder(
      ownerUserId,
      result.data,
      targetClientId,
    );
    if (!committed.ok) {
      return [textMessage(committed.error || "建立提醒失敗")];
    }
    const when = new Date(committed.remindAt!);
    const dateLabel = new Intl.DateTimeFormat("zh-Hant-TW", {
      timeZone: "Asia/Taipei",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(when);
    return [textMessage(`✅ 已建立提醒：${dateLabel} · ${result.data.title}`)];
  }

  if (result.intent === "edit_client") {
    const { matches } = await matchClientsByHint(
      ownerUserId,
      result.data.client_name_hint,
    );
    if (matches.length === 0) {
      return [
        textMessage(
          `找不到叫「${result.data.client_name_hint}」的客戶。要先建檔嗎？回一段客戶資訊就行，例如「${result.data.client_name_hint} 0912-345-678 信義區 三房」。`,
        ),
      ];
    }
    if (matches.length > 1) {
      const names = matches.map((m) => m.name).join("、");
      return [
        textMessage(
          `找到 ${matches.length} 個叫「${result.data.client_name_hint}」的客戶（${names}）。請說全名再試一次。`,
        ),
      ];
    }
    const matched = matches[0];
    const result2 = await commitEditClient(ownerUserId, matched.id, result.data);
    if (!result2.ok) {
      return [textMessage(result2.error || "更新失敗")];
    }
    const summary = formatPatchSummary(result.data);
    return [
      textMessage(
        summary
          ? `✅ 已更新「${matched.name}」：${summary}`
          : `✅ 已更新「${matched.name}」`,
      ),
    ];
  }

  if (result.intent === "interaction") {
    const { matches } = await matchClientsByHint(
      ownerUserId,
      result.data.client_name_hint,
    );
    if (matches.length === 0) {
      return [
        textMessage(
          `找不到叫「${result.data.client_name_hint}」的客戶。要不要先傳一段客戶資訊建檔？例如「${result.data.client_name_hint} 0912-345-678 信義區 三房」。`,
        ),
      ];
    }
    if (matches.length > 1) {
      const names = matches.map((m) => m.name).join("、");
      return [
        textMessage(
          `找到 ${matches.length} 個叫「${result.data.client_name_hint}」的客戶（${names}）。請說全名再試一次。`,
        ),
      ];
    }
    const matched = matches[0];
    const committed = await commitInteraction(
      ownerUserId,
      matched.id,
      result.data,
    );
    if (!committed.ok) {
      return [textMessage(committed.error || "建立互動紀錄失敗")];
    }
    return [
      textMessage(
        `✅ 已記錄：${matched.name} · ${result.data.type}${
          result.data.note ? ` — ${result.data.note}` : ""
        }`,
      ),
    ];
  }

  return [unknownReply()];
}

function unknownReply(): LineMessage {
  return textMessage(
    "我看不太懂這段，幾種範例：\n" +
      "• 建客戶：「王先生 3000 萬 信義區 三房」\n" +
      "• 改客戶：「改王先生預算 3500」\n" +
      "• 建提醒：「提醒我下週三聯絡王先生」\n" +
      "• 記互動：「今天帶林小姐看大安，覺得太貴」\n" +
      "• 查任務：「今天有什麼事」",
  );
}
