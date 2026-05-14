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

// message: text-only routing for MVP scaffold. Full parsing flow lands in Session B.
async function onMessage(
  event: LineMessageEvent,
  accessToken: string,
  liffUrl: string | null,
) {
  if (event.message.type !== "text") return;
  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  const admin = createAdminClient();
  const { data: binding } = await admin
    .from("line_bindings")
    .select("user_id, unbound_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  // Unbound (or previously unbound) → re-send LIFF link.
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

  // Bound: scaffold reply. AI parsing + confirm flow lands in Session B.
  await replyMessage(accessToken, event.replyToken, [
    textMessage(
      "收到。AI 建檔功能還在開發中，下一個版本會接上 — 你傳的內容會自動解析成客戶資料並請你確認。",
    ),
  ]);
}
