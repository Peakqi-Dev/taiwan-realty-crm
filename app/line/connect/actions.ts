"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BindLineResult {
  ok: boolean;
  error?: string;
}

/**
 * Binds the authenticated LeadFlow user to a LINE userId.
 * Idempotent for the same pair; rejects if the LINE userId is already
 * bound to a different LeadFlow account.
 */
export async function bindLineAction(
  lineUserId: string,
): Promise<BindLineResult> {
  if (!lineUserId) return { ok: false, error: "缺少 LINE userId" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入 LeadFlow 帳號" };

  // Admin client to read across users (RLS would hide bindings owned by others).
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("line_bindings")
    .select("user_id, unbound_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (existing && existing.user_id !== user.id && !existing.unbound_at) {
    return {
      ok: false,
      error: "此 LINE 帳號已綁定到另一個 LeadFlow 帳號，請聯絡客服或先解除舊綁定。",
    };
  }

  // upsert on user_id PK: either insert new, or reactivate the user's existing binding.
  const { error } = await admin.from("line_bindings").upsert(
    {
      user_id: user.id,
      line_user_id: lineUserId,
      bound_at: new Date().toISOString(),
      unbound_at: null,
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
