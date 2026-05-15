import { NextResponse } from "next/server";
import { lineEnv } from "@/lib/line/env";
import { verifyLineSignature } from "@/lib/line/signature";
import {
  replyMessage,
  textMessage,
  buttonsTemplate,
  type LineMessage,
} from "@/lib/line/client";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function POST(request: Request) {
  const { channelSecret, channelAccessToken, liffUrl } = lineEnv();

  if (!channelSecret || !channelAccessToken) {
    // Not yet configured. Return 200 so LINE doesn't keep retrying once the
    // webhook URL is verified, but log so we notice.
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
  // LINE expects a 200 within ~10s. Process events in parallel but await all so
  // errors surface in logs; individual handler errors don't block other events.
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
      await onMessage(event as LineMessageEvent, accessToken, liffUrl);
      return;
    }
    // Other event types (postback, join, leave, beacon, ...) are accepted but ignored for MVP.
  } catch (err: any) {
    console.error(`[LINE webhook] event ${event.type} failed:`, err?.message ?? err);
  }
}

// follow: user added the bot → welcome + LIFF binding button
async function onFollow(
  event: LineFollowEvent,
  accessToken: string,
  liffUrl: string | null,
) {
  const greeting = textMessage(
    "👋 我是 LeadFlow，你的 AI 房仲業務助手。\n\n從現在開始，跟我講一句話就能建客戶檔案，每天早上我也會主動推當天該注意的事。\n\n先綁定一下你的 LeadFlow 帳號，我才知道是誰在跟我講話。",
  );
  const button: LineMessage = liffUrl
    ? buttonsTemplate({
        altText: "點此綁定 LeadFlow 帳號",
        text: "點下面綁定 LeadFlow 帳號",
        actions: [{ type: "uri", label: "綁定帳號", uri: liffUrl }],
      })
    : textMessage("(綁定連結尚未設定，請等管理員配置 LINE_LIFF_URL)");

  await replyMessage(accessToken, event.replyToken, [greeting, button]);
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

// message: routes text to the AI parse + multi-turn confirm flow for bound users.
async function onMessage(
  event: LineMessageEvent,
  accessToken: string,
  liffUrl: string | null,
) {
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

  if (!binding || binding.unbound_at) {
    const button: LineMessage = liffUrl
      ? buttonsTemplate({
          altText: "點此綁定 LeadFlow 帳號",
          text: "先綁定 LeadFlow 帳號，我才能幫你記東西",
          actions: [{ type: "uri", label: "綁定帳號", uri: liffUrl }],
        })
      : textMessage("綁定連結尚未設定，請等管理員配置。");
    await replyMessage(accessToken, event.replyToken, [button]);
    return;
  }

  const ownerUserId = binding.user_id as string;

  // Rich-menu shortcuts — handle BEFORE the AI flow so they don't get parsed.
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
        textMessage("拿不到今天的任務，請稍後再試。"),
      ]);
    }
    return;
  }

  const pending = await getActiveDraft(lineUserId);
  const intent = classifyIntent(text);

  // No pending draft → must be a fresh client description.
  if (!pending) {
    if (intent.kind === "confirm" || intent.kind === "cancel") {
      await replyMessage(accessToken, event.replyToken, [
        textMessage(
          "目前沒有待確認的客戶資料。直接傳客戶資訊給我，例如：「王先生 3000 萬 信義區 三房」。",
        ),
      ]);
      return;
    }
    await tryParseAndConfirm(accessToken, event.replyToken, lineUserId, text, ownerUserId);
    return;
  }

  // Pending draft exists.
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
    try {
      const patched = await patchClientDraft(pending, intent.instruction);
      await setDraft(lineUserId, patched);
      await replyMessage(accessToken, event.replyToken, [
        textMessage(formatDraftForConfirm(patched)),
      ]);
    } catch (err) {
      console.error("[LINE webhook] patch failed:", err);
      await replyMessage(accessToken, event.replyToken, [
        textMessage("AI 慢半拍沒解出來，請再講一次「改 XX YY」。"),
      ]);
    }
    return;
  }

  // freeform text while a draft is pending → re-route through the classifier.
  await tryParseAndConfirm(accessToken, event.replyToken, lineUserId, text, ownerUserId);
}

async function tryParseAndConfirm(
  accessToken: string,
  replyToken: string,
  lineUserId: string,
  text: string,
  ownerUserId: string,
) {
  try {
    const result = await classifyIntentAndExtract(text);
    if (!result) {
      await replyUnknown(accessToken, replyToken);
      return;
    }

    if (result.intent === "client") {
      await setDraft(lineUserId, result.data);
      await replyMessage(accessToken, replyToken, [
        textMessage(formatDraftForConfirm(result.data)),
      ]);
      return;
    }

    if (result.intent === "today_tasks") {
      const brief = await buildDailyBrief(ownerUserId);
      await replyMessage(accessToken, replyToken, [textMessage(brief.text)]);
      return;
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
        await replyMessage(accessToken, replyToken, [
          textMessage(committed.error || "建立提醒失敗"),
        ]);
        return;
      }
      const when = new Date(committed.remindAt!);
      const dateLabel = new Intl.DateTimeFormat("zh-Hant-TW", {
        timeZone: "Asia/Taipei",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(when);
      await replyMessage(accessToken, replyToken, [
        textMessage(`✅ 已建立提醒：${dateLabel} · ${result.data.title}`),
      ]);
      return;
    }

    if (result.intent === "interaction") {
      const { matches } = await matchClientsByHint(
        ownerUserId,
        result.data.client_name_hint,
      );
      if (matches.length === 0) {
        await replyMessage(accessToken, replyToken, [
          textMessage(
            `找不到叫「${result.data.client_name_hint}」的客戶。要不要先傳一段客戶資訊建檔？例如「${result.data.client_name_hint} 0912-345-678 信義區 三房」。`,
          ),
        ]);
        return;
      }
      if (matches.length > 1) {
        const names = matches.map((m) => m.name).join("、");
        await replyMessage(accessToken, replyToken, [
          textMessage(
            `找到 ${matches.length} 個叫「${result.data.client_name_hint}」的客戶（${names}）。請說全名再試一次。`,
          ),
        ]);
        return;
      }
      const matched = matches[0];
      const committed = await commitInteraction(
        ownerUserId,
        matched.id,
        result.data,
      );
      if (!committed.ok) {
        await replyMessage(accessToken, replyToken, [
          textMessage(committed.error || "建立互動紀錄失敗"),
        ]);
        return;
      }
      await replyMessage(accessToken, replyToken, [
        textMessage(
          `✅ 已記錄：${matched.name} · ${result.data.type}${
            result.data.note ? ` — ${result.data.note}` : ""
          }`,
        ),
      ]);
      return;
    }

    // unknown
    await replyUnknown(accessToken, replyToken);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[LINE webhook] parse failed:", msg);
    await replyMessage(accessToken, replyToken, [
      textMessage("AI 解析失敗，請稍後再試一次。"),
    ]);
  }
}

async function replyUnknown(accessToken: string, replyToken: string) {
  await replyMessage(accessToken, replyToken, [
    textMessage(
      "我看不太懂這段，幾種範例：\n" +
        "• 建客戶：「王先生 3000 萬 信義區 三房」\n" +
        "• 建提醒：「提醒我下週三聯絡王先生」\n" +
        "• 記互動：「今天帶林小姐看大安，覺得太貴」\n" +
        "• 查任務：「今天有什麼事」",
    ),
  ]);
}
