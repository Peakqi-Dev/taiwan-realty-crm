import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lineEnv } from "@/lib/line/env";
import { pushMessage, textMessage } from "@/lib/line/client";
import { appendMessage } from "@/lib/line/customer";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/<id>/reply  body: { text }
 *
 * Agent sends a message back to the customer through the bot. We:
 *   1. Verify the agent owns this conversation.
 *   2. Push the message to the customer over LINE.
 *   3. Log it as sender_type=agent and bump status to agent_handling.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauth" }, { status: 401 });

  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  const admin = createAdminClient();
  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("id, agent_user_id, customer:customers(line_user_id)")
    .eq("id", params.id)
    .maybeSingle();
  if (convErr) return NextResponse.json({ ok: false, error: convErr.message }, { status: 500 });
  if (!conv) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (conv.agent_user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const customerRel = conv.customer as
    | { line_user_id: string }
    | { line_user_id: string }[]
    | null;
  const customer = Array.isArray(customerRel) ? customerRel[0] : customerRel;
  if (!customer?.line_user_id) {
    return NextResponse.json({ ok: false, error: "no_customer_line_id" }, { status: 500 });
  }

  const { channelAccessToken } = lineEnv();
  if (!channelAccessToken) {
    return NextResponse.json({ ok: false, error: "line_not_configured" }, { status: 500 });
  }

  const pushed = await pushMessage(channelAccessToken, customer.line_user_id, [
    textMessage(text),
  ]);
  if (!pushed.ok) {
    console.error("[/api/conversations/reply] push failed:", pushed.status, pushed.body);
    return NextResponse.json(
      { ok: false, error: `push_failed_${pushed.status}` },
      { status: 502 },
    );
  }

  try {
    await appendMessage({
      conversationId: params.id,
      senderType: "agent",
      text,
    });
  } catch (err) {
    console.error("[/api/conversations/reply] log failed:", err);
  }

  await admin
    .from("conversations")
    .update({ status: "agent_handling" })
    .eq("id", params.id);

  return NextResponse.json({ ok: true });
}
