"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SaveAgentProfileState {
  ok?: boolean;
  error?: string;
}

const URL_REGEX = /^https?:\/\/[^\s]+$/;

export async function saveAgentProfile(
  _prev: SaveAgentProfileState,
  formData: FormData,
): Promise<SaveAgentProfileState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const photoUrl = String(formData.get("photo_url") ?? "").trim();
  const lineId = String(formData.get("line_id") ?? "").trim();

  if (!displayName) return { error: "顯示名稱必填" };
  if (displayName.length > 30) return { error: "顯示名稱請在 30 字以內" };
  if (phone && phone.length > 30) return { error: "電話格式不正確" };
  if (bio.length > 200) return { error: "自我介紹請在 200 字以內" };
  if (photoUrl && !URL_REGEX.test(photoUrl))
    return { error: "大頭照網址需為完整 https URL" };
  if (lineId && lineId.length > 50) return { error: "LINE ID 過長" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("agent_profiles")
    .update({
      display_name: displayName,
      phone,
      bio,
      photo_url: photoUrl || null,
      line_id: lineId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (error) return { error: `儲存失敗：${error.message}` };

  revalidatePath("/app/profile");
  revalidatePath("/app/qr");
  revalidatePath(`/r/`);
  return { ok: true };
}
