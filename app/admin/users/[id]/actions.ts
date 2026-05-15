"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UpdateUserState {
  ok?: boolean;
  error?: string;
}

export async function updateUserNameAction(
  userId: string,
  _prev: UpdateUserState,
  formData: FormData,
): Promise<UpdateUserState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) return { error: "姓名不能空白" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { display_name: displayName },
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}
