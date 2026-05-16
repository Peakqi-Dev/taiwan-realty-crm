import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientDraft } from "@/lib/ai/parse-client";

const TTL_MINUTES = 5;
const KIND_CLIENT_DRAFT = "client_draft";

/**
 * Return the active (non-expired) client draft for a LINE user, if any.
 * Side-effect: also deletes expired rows for that user.
 */
export async function getActiveDraft(
  lineUserId: string,
): Promise<ClientDraft | null> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Cleanup stale rows for this user. Cheap and prevents accumulation.
  await admin
    .from("line_pending_actions")
    .delete()
    .eq("line_user_id", lineUserId)
    .lt("expires_at", nowIso);

  const { data } = await admin
    .from("line_pending_actions")
    .select("payload")
    .eq("line_user_id", lineUserId)
    .eq("kind", KIND_CLIENT_DRAFT)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return data.payload as ClientDraft;
}

export async function setDraft(
  lineUserId: string,
  draft: ClientDraft,
): Promise<void> {
  const admin = createAdminClient();
  // Replace any existing draft for this user — one active draft at a time.
  await admin
    .from("line_pending_actions")
    .delete()
    .eq("line_user_id", lineUserId)
    .eq("kind", KIND_CLIENT_DRAFT);
  await admin.from("line_pending_actions").insert({
    line_user_id: lineUserId,
    kind: KIND_CLIENT_DRAFT,
    payload: draft,
    expires_at: new Date(Date.now() + TTL_MINUTES * 60_000).toISOString(),
  });
}

export async function clearDraft(lineUserId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("line_pending_actions")
    .delete()
    .eq("line_user_id", lineUserId)
    .eq("kind", KIND_CLIENT_DRAFT);
}

const KIND_PROPERTY_DRAFT = "property_draft";

export async function getActivePropertyDraft(
  lineUserId: string,
): Promise<import("@/lib/ai/classify-intent").PropertyDraft | null> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  await admin
    .from("line_pending_actions")
    .delete()
    .eq("line_user_id", lineUserId)
    .lt("expires_at", nowIso);
  const { data } = await admin
    .from("line_pending_actions")
    .select("payload")
    .eq("line_user_id", lineUserId)
    .eq("kind", KIND_PROPERTY_DRAFT)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return data.payload as import("@/lib/ai/classify-intent").PropertyDraft;
}

export async function setPropertyDraft(
  lineUserId: string,
  draft: import("@/lib/ai/classify-intent").PropertyDraft,
): Promise<void> {
  const admin = createAdminClient();
  const del = await admin
    .from("line_pending_actions")
    .delete()
    .eq("line_user_id", lineUserId)
    .eq("kind", KIND_PROPERTY_DRAFT);
  if (del.error) {
    console.error("[setPropertyDraft] delete failed:", del.error.message);
  }
  const ins = await admin.from("line_pending_actions").insert({
    line_user_id: lineUserId,
    kind: KIND_PROPERTY_DRAFT,
    payload: draft,
    expires_at: new Date(Date.now() + TTL_MINUTES * 60_000).toISOString(),
  });
  if (ins.error) {
    console.error("[setPropertyDraft] insert failed:", ins.error.message);
    throw new Error(`pending insert failed: ${ins.error.message}`);
  }
}

export async function clearPropertyDraft(lineUserId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("line_pending_actions")
    .delete()
    .eq("line_user_id", lineUserId)
    .eq("kind", KIND_PROPERTY_DRAFT);
}

const KIND_AWAITING_FEEDBACK = "awaiting_feedback";

/** Mark this LINE user as expecting their next message to be feedback. */
export async function setAwaitingFeedback(lineUserId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("line_pending_actions")
    .delete()
    .eq("line_user_id", lineUserId)
    .eq("kind", KIND_AWAITING_FEEDBACK);
  await admin.from("line_pending_actions").insert({
    line_user_id: lineUserId,
    kind: KIND_AWAITING_FEEDBACK,
    payload: {},
    expires_at: new Date(Date.now() + TTL_MINUTES * 60_000).toISOString(),
  });
}

export async function isAwaitingFeedback(lineUserId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("line_pending_actions")
    .select("id")
    .eq("line_user_id", lineUserId)
    .eq("kind", KIND_AWAITING_FEEDBACK)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return !!data;
}

export async function clearAwaitingFeedback(lineUserId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("line_pending_actions")
    .delete()
    .eq("line_user_id", lineUserId)
    .eq("kind", KIND_AWAITING_FEEDBACK);
}
