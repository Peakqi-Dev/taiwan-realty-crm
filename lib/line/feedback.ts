import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Save a free-text feedback message from a LINE user. user_id is best-effort —
 * we leave it null if no active binding exists.
 */
export async function saveFeedback(
  lineUserId: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!message) return { ok: false, error: "empty" };
  const admin = createAdminClient();
  const { data: binding } = await admin
    .from("line_bindings")
    .select("user_id, unbound_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  const userId =
    binding && !binding.unbound_at ? (binding.user_id as string) : null;

  const { error } = await admin.from("feedback").insert({
    line_user_id: lineUserId,
    user_id: userId,
    message,
    source: "line_menu",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
