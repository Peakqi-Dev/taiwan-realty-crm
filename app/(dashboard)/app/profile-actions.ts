"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SaveProfileState {
  ok?: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Updates the signed-in user's email (if a real one is provided) and
 * upserts a beta_applications row with phone/email for the dashboard
 * profile prompt.
 */
export async function saveProfileAction(
  _prev: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const newEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!newEmail && !phone) return { error: "請至少填一個欄位" };
  if (newEmail && !EMAIL_REGEX.test(newEmail))
    return { error: "Email 格式不正確" };

  const admin = createAdminClient();

  // Update auth.users.email if user provided a real one and it differs from current.
  if (newEmail && newEmail !== user.email) {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    });
    if (error) return { error: `Email 更新失敗：${error.message}` };
  }

  // Beta application row keyed on email; use the real email if provided,
  // otherwise the current user email.
  const targetEmail = newEmail || user.email || "";
  if (targetEmail) {
    const { data: existing } = await admin
      .from("beta_applications")
      .select("id")
      .eq("email", targetEmail)
      .maybeSingle();
    const displayName =
      (user.user_metadata?.display_name as string | undefined) ||
      targetEmail.split("@")[0];
    if (existing) {
      await admin
        .from("beta_applications")
        .update({ phone: phone || null })
        .eq("id", existing.id);
    } else {
      await admin.from("beta_applications").insert({
        email: targetEmail,
        name: displayName,
        phone: phone || null,
        user_id: user.id,
      });
    }
  }

  revalidatePath("/app");
  return { ok: true };
}
