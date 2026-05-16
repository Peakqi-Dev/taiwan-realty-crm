import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationsClient } from "./conversations-client";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">對話管理</h1>
        <p className="text-sm text-slate-600">
          所有客人跟 AI / 你的對話都在這裡。點任何一筆進去看完整紀錄並接手回覆。
        </p>
      </header>

      <ConversationsClient />
    </div>
  );
}
