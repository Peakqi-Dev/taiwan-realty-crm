/**
 * Helpers for the customer-side of the shared LINE bot.
 *
 * Lifecycle on a customer's first message:
 *   1. consumePairing()  — look up pending customer_pairings, mark bound_at
 *   2. ensureCustomer()  — upsert the customers row tied to that agent
 *   3. ensureConversation() — upsert the conversation thread
 *   4. appendMessage()   — log inbound / outbound text + update activity
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface ConsumedPairing {
  agentUserId: string;
}

/**
 * Returns the agent that should own this customer, based on the most recent
 * un-bound pairing row written by /api/line/pair. Marks the row as bound so
 * it won't get re-consumed. Returns null when there's no pending pairing
 * (e.g. customer added the bot directly without scanning a QR).
 */
export async function consumePairing(
  customerLineUserId: string,
): Promise<ConsumedPairing | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customer_pairings")
    .select("id, agent_user_id, created_at, bound_at")
    .eq("customer_line_user_id", customerLineUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[customer] consumePairing lookup:", error.message);
    return null;
  }
  if (!data) return null;

  // Even already-bound rows are useful — they tell us this user is a
  // customer of <agent_user_id>. Pairing is permanent until they re-scan a
  // different agent's QR.
  if (!data.bound_at) {
    await admin
      .from("customer_pairings")
      .update({ bound_at: new Date().toISOString() })
      .eq("id", data.id);
  }
  return { agentUserId: data.agent_user_id as string };
}

export interface CustomerRow {
  id: string;
  agentUserId: string;
  displayName: string;
}

/**
 * Idempotent upsert of customers row. If the customer scans a different
 * agent's QR later, agent_user_id is overwritten (latest wins).
 */
export async function ensureCustomer(opts: {
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
  agentUserId: string;
}): Promise<CustomerRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .upsert(
      {
        line_user_id: opts.lineUserId,
        display_name: opts.displayName,
        picture_url: opts.pictureUrl,
        agent_user_id: opts.agentUserId,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "line_user_id" },
    )
    .select("id, agent_user_id, display_name")
    .single();
  if (error || !data) {
    throw new Error(`ensureCustomer failed: ${error?.message ?? "unknown"}`);
  }
  return {
    id: data.id as string,
    agentUserId: data.agent_user_id as string,
    displayName: data.display_name as string,
  };
}

/** Look up an existing customer by their LINE userId (no upsert). */
export async function findCustomer(
  lineUserId: string,
): Promise<CustomerRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("id, agent_user_id, display_name")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (error) {
    console.error("[customer] findCustomer:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id as string,
    agentUserId: data.agent_user_id as string,
    displayName: data.display_name as string,
  };
}

export interface ConversationRow {
  id: string;
  status: "ai" | "needs_agent" | "agent_handling" | "resolved";
}

/** Idempotent: returns the conversation between (agent, customer), creating one if needed. */
export async function ensureConversation(opts: {
  agentUserId: string;
  customerId: string;
}): Promise<ConversationRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("conversations")
    .upsert(
      {
        agent_user_id: opts.agentUserId,
        customer_id: opts.customerId,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "agent_user_id,customer_id" },
    )
    .select("id, status")
    .single();
  if (error || !data) {
    throw new Error(`ensureConversation failed: ${error?.message ?? "unknown"}`);
  }
  return {
    id: data.id as string,
    status: data.status as ConversationRow["status"],
  };
}

/**
 * Insert a single message and bump the conversation's recency + unread
 * counter (only for messages the agent hasn't seen yet — i.e. customer +
 * AI-generated turns).
 */
export async function appendMessage(opts: {
  conversationId: string;
  senderType: "customer" | "ai" | "agent";
  text: string;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error: insErr } = await admin.from("messages").insert({
    conversation_id: opts.conversationId,
    sender_type: opts.senderType,
    text: opts.text,
  });
  if (insErr) {
    console.error("[customer] appendMessage insert:", insErr.message);
    throw new Error(`appendMessage failed: ${insErr.message}`);
  }

  const bumpUnread = opts.senderType === "customer";
  // RPC would be cleaner; for now use a fetch-then-update so we don't have
  // to add a SQL function. Race conditions on unread_count are acceptable —
  // dashboard polls, so off-by-one is invisible to the user.
  if (bumpUnread) {
    const { data: row } = await admin
      .from("conversations")
      .select("unread_count")
      .eq("id", opts.conversationId)
      .single();
    await admin
      .from("conversations")
      .update({
        last_message_at: now,
        unread_count: (row?.unread_count ?? 0) + 1,
      })
      .eq("id", opts.conversationId);
  } else {
    await admin
      .from("conversations")
      .update({ last_message_at: now })
      .eq("id", opts.conversationId);
  }
}
