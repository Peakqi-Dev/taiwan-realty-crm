import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversations
 * Returns the current agent's conversation list, sorted by last_message_at.
 * Each entry includes the customer's name + last message snippet.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauth" }, { status: 401 });

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "all"; // all | unread | needs_agent

  const admin = createAdminClient();
  let q = admin
    .from("conversations")
    .select(
      "id, status, last_message_at, unread_count, customer:customers(id, display_name, picture_url, line_user_id)",
    )
    .eq("agent_user_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (filter === "unread") q = q.gt("unread_count", 0);
  if (filter === "needs_agent") q = q.eq("status", "needs_agent");

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Fetch the latest message text for each row in one batched query.
  const conversationIds = (rows ?? []).map((r) => r.id as string);
  let lastMessages: Record<string, { sender_type: string; text: string }> = {};
  if (conversationIds.length > 0) {
    const { data: msgs } = await admin
      .from("messages")
      .select("conversation_id, sender_type, text, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });
    // Keep the most-recent per conversation (first occurrence given order).
    for (const m of msgs ?? []) {
      const cid = m.conversation_id as string;
      if (!lastMessages[cid]) {
        lastMessages[cid] = {
          sender_type: m.sender_type as string,
          text: m.text as string,
        };
      }
    }
  }

  const items = (rows ?? []).map((r) => {
    // Supabase types the joined relation as an array even though it's 1:1.
    const customerRel = r.customer as
      | { id: string; display_name: string; picture_url: string | null; line_user_id: string }
      | { id: string; display_name: string; picture_url: string | null; line_user_id: string }[]
      | null;
    const customer = Array.isArray(customerRel) ? customerRel[0] : customerRel;
    const last = lastMessages[r.id as string];
    return {
      id: r.id,
      status: r.status,
      lastMessageAt: r.last_message_at,
      unreadCount: r.unread_count,
      customer: customer
        ? {
            id: customer.id,
            displayName: customer.display_name,
            pictureUrl: customer.picture_url,
          }
        : null,
      lastMessage: last
        ? { senderType: last.sender_type, text: last.text }
        : null,
    };
  });

  return NextResponse.json({ ok: true, items });
}
