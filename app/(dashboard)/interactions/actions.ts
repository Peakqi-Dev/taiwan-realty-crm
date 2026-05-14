"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Interaction, InteractionType } from "@/lib/types";
import { rowToInteraction } from "@/hooks/use-interactions";

export interface InteractionActionState {
  error?: string;
}

export async function createInteractionAction(
  clientId: string,
  _prev: InteractionActionState,
  formData: FormData,
): Promise<{ error?: string; interaction?: Interaction }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const note = String(formData.get("note") ?? "").trim();
  const type = String(formData.get("type") ?? "電話") as InteractionType;
  const propertyId = String(formData.get("propertyId") ?? "").trim();

  if (!note) return { error: "請輸入互動內容" };

  const { data, error } = await supabase
    .from("interactions")
    .insert({
      client_id: clientId,
      property_id: propertyId || null,
      type,
      note,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };

  // Bump the client's last_contact_at so the dashboard list reorders correctly.
  // RLS makes this a no-op if the agent doesn't own the client.
  await supabase
    .from("clients")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", clientId);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
  return { interaction: rowToInteraction(data) };
}
