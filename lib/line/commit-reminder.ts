import { createAdminClient } from "@/lib/supabase/admin";
import type { ReminderDraft } from "@/lib/ai/classify-intent";

type ReminderType = "追蹤客戶" | "委託到期" | "帶看行程" | "自訂";

function inferType(title: string, hasClient: boolean): ReminderType {
  if (/帶看|看屋/.test(title)) return "帶看行程";
  if (/委託|到期/.test(title)) return "委託到期";
  if (hasClient || /聯絡|回電|追蹤|跟進/.test(title)) return "追蹤客戶";
  return "自訂";
}

export interface CommitReminderResult {
  ok: boolean;
  error?: string;
  reminderId?: string;
  type?: string;
  remindAt?: string;
}

export async function commitReminder(
  ownerUserId: string,
  draft: ReminderDraft,
  targetClientId: string | null,
): Promise<CommitReminderResult> {
  if (!draft.remind_at_iso) {
    return { ok: false, error: "看不出提醒時間，請說『5/21』或『下週三』這種。" };
  }

  // Normalize to a full ISO timestamp. Dates without time default to 09:00 Taipei.
  let iso = draft.remind_at_iso;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) iso = `${iso}T09:00:00+08:00`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) iso = `${iso}:00+08:00`;
  const remindAt = new Date(iso);
  if (Number.isNaN(remindAt.getTime())) {
    return { ok: false, error: "提醒時間格式錯誤，再講一次時間？" };
  }

  const type = inferType(draft.title, targetClientId !== null);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reminders")
    .insert({
      type,
      title: draft.title,
      target_id: targetClientId,
      remind_at: remindAt.toISOString(),
      is_done: false,
      created_by: ownerUserId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    reminderId: data.id,
    type,
    remindAt: remindAt.toISOString(),
  };
}
