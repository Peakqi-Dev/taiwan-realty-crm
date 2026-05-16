import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QrShareCard } from "./qr-share-card";

export const dynamic = "force-dynamic";

async function loadAgentProfile(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_profiles")
    .select("short_code, display_name, phone, photo_url, bio")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[/app/qr] load failed:", error.message);
    return null;
  }
  return data;
}

function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.replace(/^https?:\/\//, "")
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "https://taiwan-realty-crm.vercel.app"
  );
}

export default async function QrPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadAgentProfile(user.id);
  if (!profile) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">我的 QR Code</h1>
        <p className="text-sm text-slate-600">
          你還沒有 agent_profiles 資料。請聯絡管理員。
        </p>
      </div>
    );
  }

  const origin = appOrigin();
  const shareUrl = `${origin}/r/${profile.short_code}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">我的專屬 QR Code</h1>
        <p className="text-sm text-slate-600">
          客戶掃這個 QR Code 加你 LINE，AI 助手會自動以你的名義回覆，並把對話同步到 LeadFlow。
        </p>
      </header>

      <QrShareCard
        shareUrl={shareUrl}
        agentName={profile.display_name}
        shortCode={profile.short_code}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold">怎麼用</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-600">
          <li>1. 印出 QR 或直接傳連結給客戶</li>
          <li>2. 客戶掃碼 → 看到你的介紹頁 → 點「加我 LINE」</li>
          <li>3. 客戶加好友後，AI 自動以你的名義開始服務</li>
          <li>
            4. 你在「對話管理」可以隨時看到全部對話，也能直接介入回覆
          </li>
        </ol>
      </section>
    </div>
  );
}
