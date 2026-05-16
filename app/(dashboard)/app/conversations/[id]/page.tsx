import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationDetailClient } from "./conversation-detail-client";

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <ConversationDetailClient conversationId={params.id} />;
}
