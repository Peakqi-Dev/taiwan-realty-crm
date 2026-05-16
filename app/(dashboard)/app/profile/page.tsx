import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

async function loadAgentProfile(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_profiles")
    .select("display_name, phone, bio, photo_url, line_id, short_code")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[/app/profile] load failed:", error.message);
    return null;
  }
  return data;
}

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadAgentProfile(user.id);
  if (!profile) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">個人資料</h1>
        <p className="text-sm text-slate-600">
          找不到 agent_profiles 資料，請聯絡管理員。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">個人資料</h1>
        <p className="text-sm text-slate-600">
          這些是客戶在你的 LINE 加好友頁 (/r/{profile.short_code}) 看到的資訊。
          填好之後，AI 助手回覆給客戶時也會用你的名字。
        </p>
      </header>

      <ProfileForm
        initial={{
          displayName: profile.display_name,
          phone: profile.phone,
          bio: profile.bio,
          photoUrl: profile.photo_url ?? "",
          lineId: profile.line_id,
        }}
      />
    </div>
  );
}
