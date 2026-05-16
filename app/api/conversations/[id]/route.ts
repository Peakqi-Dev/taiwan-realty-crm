import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversations/<id> — full conversation thread for the dashboard.
 * Also clears unread_count on read (so the badge in the list disappears).
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauth" }, { status: 401 });

  const admin = createAdminClient();
  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select(
      "id, status, last_message_at, unread_count, agent_user_id, customer:customers(id, display_name, picture_url, line_user_id)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (convErr) {
    return NextResponse.json({ ok: false, error: convErr.message }, { status: 500 });
  }
  if (!conv) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (conv.agent_user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { data: messages, error: msgErr } = await admin
    .from("messages")
    .select("id, sender_type, text, created_at")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true })
    .limit(500);
  if (msgErr) {
    return NextResponse.json({ ok: false, error: msgErr.message }, { status: 500 });
  }

  if (conv.unread_count > 0) {
    await admin.from("conversations").update({ unread_count: 0 }).eq("id", params.id);
  }

  const customerRel = conv.customer as
    | { id: string; display_name: string; picture_url: string | null; line_user_id: string }
    | { id: string; display_name: string; picture_url: string | null; line_user_id: string }[]
    | null;
  const customer = Array.isArray(customerRel) ? customerRel[0] : customerRel;

  return NextResponse.json({
    ok: true,
    conversation: {
      id: conv.id,
      status: conv.status,
      customer: customer
        ? {
            id: customer.id,
            displayName: customer.display_name,
            pictureUrl: customer.picture_url,
            lineUserId: customer.line_user_id,
          }
        : null,
    },
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      senderType: m.sender_type,
      text: m.text,
      createdAt: m.created_at,
    })),
  });
}
