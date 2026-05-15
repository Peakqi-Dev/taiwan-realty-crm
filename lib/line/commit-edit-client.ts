import { createAdminClient } from "@/lib/supabase/admin";
import type { EditClientDraft } from "@/lib/ai/classify-intent";

export interface EditClientResult {
  ok: boolean;
  error?: string;
  applied?: string[]; // human-readable list of changed fields
}

/**
 * Apply an edit_client patch to a known client. Only sets columns the AI
 * actually filled (non-null), so a "改預算 3500" message doesn't wipe
 * districts/status.
 */
export async function commitEditClient(
  ownerUserId: string,
  clientId: string,
  draft: EditClientDraft,
): Promise<EditClientResult> {
  const p = draft.patch;
  const update: Record<string, unknown> = {};
  const applied: string[] = [];

  if (p.budget_min !== null) {
    update.budget_min = p.budget_min;
    applied.push("預算下限");
  }
  if (p.budget_max !== null) {
    update.budget_max = p.budget_max;
    applied.push("預算上限");
  }
  if (p.districts && p.districts.length > 0) {
    update.preferred_districts = p.districts;
    applied.push("偏好區域");
  }
  if (p.room_type !== null) {
    update.requirements = `房型：${p.room_type}`;
    applied.push("房型");
  }
  if (p.status !== null) {
    update.status = p.status;
    applied.push("狀態");
  }
  if (p.requirements !== null) {
    // If room_type also set, requirements overwrites with concat.
    update.requirements = update.requirements
      ? `${update.requirements}\n${p.requirements}`
      : p.requirements;
    if (!applied.includes("備註")) applied.push("備註");
  }

  if (Object.keys(update).length === 0) {
    return { ok: false, error: "沒有要更新的欄位" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update(update)
    .eq("id", clientId)
    .eq("assigned_to", ownerUserId);
  if (error) return { ok: false, error: error.message };

  return { ok: true, applied };
}

/** Format the patch summary for the LINE confirmation message. */
export function formatPatchSummary(draft: EditClientDraft): string {
  const lines: string[] = [];
  const p = draft.patch;
  if (p.budget_min !== null || p.budget_max !== null) {
    if (p.budget_min !== null && p.budget_max !== null) {
      if (p.budget_min === p.budget_max) {
        lines.push(`預算：${p.budget_min} 萬`);
      } else {
        lines.push(`預算：${p.budget_min}-${p.budget_max} 萬`);
      }
    } else if (p.budget_min !== null) {
      lines.push(`預算：${p.budget_min} 萬以上`);
    } else if (p.budget_max !== null) {
      lines.push(`預算：${p.budget_max} 萬以下`);
    }
  }
  if (p.districts && p.districts.length > 0) {
    lines.push(`區域：${p.districts.join("、")}`);
  }
  if (p.room_type) lines.push(`房型：${p.room_type}`);
  if (p.status) lines.push(`狀態：${p.status}`);
  if (p.requirements) lines.push(`備註：${p.requirements}`);
  return lines.join("、");
}
