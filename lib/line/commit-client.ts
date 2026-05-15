import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientDraft } from "@/lib/ai/parse-client";

export interface CommitResult {
  ok: boolean;
  error?: string;
  clientId?: string;
}

/**
 * Persist a draft as a real clients row owned by the LINE user's bound LeadFlow account.
 * Defaults applied here mirror the form path's behaviour.
 */
export async function commitClientDraft(
  ownerUserId: string,
  draft: ClientDraft,
): Promise<CommitResult> {
  if (!draft.name) return { ok: false, error: "客戶姓名未填，無法建檔。" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .insert({
      name: draft.name,
      phone: draft.phone ?? "(LINE 建檔，未提供電話)",
      line_id: draft.line_id,
      type: draft.type ?? "買方",
      status: "新客戶",
      budget_min: draft.budget_min,
      budget_max: draft.budget_max,
      preferred_districts: draft.districts,
      requirements: [
        draft.room_type ? `房型：${draft.room_type}` : null,
        draft.notes || null,
      ]
        .filter(Boolean)
        .join("\n"),
      assigned_to: ownerUserId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, clientId: data.id };
}
