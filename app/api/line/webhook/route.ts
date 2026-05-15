import { NextResponse } from "next/server";
import { lineEnv } from "@/lib/line/env";
import { verifyLineSignature } from "@/lib/line/signature";
import {
  replyMessage,
  pushMessage,
  textMessage,
  buttonsTemplate,
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
} from "@/lib/line/pending";
import { classifyIntent } from "@/lib/line/intent";
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
const PROCESSING_MESSAGE = "收到，處理中 ⏳";

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

  const messages: LineMessage[] = [
    textMessage(
      `👋 ${displayName}，我是 LeadFlow，你的 AI 房仲業務助手。\n\n你的帳號已經建好了！直接跟我講客戶資訊就能建檔，例如：\n「王先生 3000 萬 信義區 三房」\n\n底部選單有：📝 新增客戶 / 📋 今日任務 / 📊 打開助手。`,
    ),
  ];
  if (liffUrl) {
    messages.push(
      buttonsTemplate({
        altText: "打開 LeadFlow 助手",
        text: "想看完整資料，打開 LeadFlow 助手",
        actions: [{ type: "uri", label: "打開助手", uri: liffUrl }],
      }),
    );
  }
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

  const pending = await getActiveDraft(lineUserId);
  const intent = classifyIntent(text);

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

  // AI classifier path — heavy. Ack first, push the result.
  await runWithAck(accessToken, event.replyToken, lineUserId, async () =>
    computeIntentMessages(text, lineUserId, ownerUserId),
  );
}

/**
 * Reply with the "處理中" ack immediately, then run heavy work and Push the
 * result. Errors fall back to a generic busy message.
 *
 * The reply token can only be used once and within ~60s; this two-step
 * pattern keeps the perceived latency low (~200ms) while still delivering
 * the real answer once the AI returns.
 */
async function runWithAck(
  accessToken: string,
  replyToken: string,
  lineUserId: string,
  work: () => Promise<LineMessage[]>,
) {
  // Don't block on the ack — fire it and continue. If it fails the user just
  // sees the final push slightly later.
  const ackPromise = replyMessage(accessToken, replyToken, [
    textMessage(PROCESSING_MESSAGE),
  ]).catch((err) => {
    console.warn("[LINE webhook] ack reply failed:", err);
    return undefined;
  });

  let messages: LineMessage[] = [];
  try {
    messages = await work();
  } catch (err) {
    console.error("[LINE webhook] heavy work failed:", err);
    messages = [textMessage(BUSY_MESSAGE)];
  }

  await ackPromise;
  if (messages.length > 0) {
    const pushed = await pushMessage(accessToken, lineUserId, messages);
    if (!pushed.ok) {
      console.error(
        "[LINE webhook] push failed:",
        pushed.status,
        pushed.body ?? "",
      );
    }
  }
}

async function computeIntentMessages(
  text: string,
  lineUserId: string,
  ownerUserId: string,
): Promise<LineMessage[]> {
  const result = await classifyIntentAndExtract(text);
  if (!result) return [unknownReply()];

  if (result.intent === "client") {
    await setDraft(lineUserId, result.data);
    return [textMessage(formatDraftForConfirm(result.data))];
  }

  if (result.intent === "today_tasks") {
    const brief = await buildDailyBrief(ownerUserId);
    return [textMessage(brief.text)];
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
