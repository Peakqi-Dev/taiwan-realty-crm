"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Reminder, ReminderType } from "@/lib/types";
import { rowToReminder } from "@/hooks/use-reminders";

export interface ReminderActionState {
  error?: string;
}

function parseBody(formData: FormData) {
  const targetId = String(formData.get("targetId") ?? "").trim();
  return {
    type: String(formData.get("type") ?? "自訂") as ReminderType,
    title: String(formData.get("title") ?? "").trim(),
    target_id: targetId || null,
    remind_at: new Date(
      String(formData.get("remindAt") ?? ""),
    ).toISOString(),
    is_done: false,
  };
}

export async function createReminderAction(
  _prev: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const body = parseBody(formData);
  if (!body.title) return { error: "請輸入提醒內容" };
  if (Number.isNaN(new Date(body.remind_at).getTime())) {
    return { error: "請選擇有效的提醒日期" };
  }

  const { error } = await supabase
    .from("reminders")
    .insert({ ...body, created_by: user.id });
  if (error) return { error: error.message };

  revalidatePath("/reminders");
  revalidatePath("/");
  return {};
}

export async function toggleReminderDoneAction(
  id: string,
): Promise<{ error?: string; reminder?: Reminder }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const { data: current, error: rErr } = await supabase
    .from("reminders")
    .select("is_done")
    .eq("id", id)
    .single();
  if (rErr) return { error: rErr.message };

  const { data, error } = await supabase
    .from("reminders")
    .update({ is_done: !current.is_done })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/reminders");
  revalidatePath("/");
  return { reminder: rowToReminder(data) };
}

export async function deleteReminderAction(
  id: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/reminders");
  revalidatePath("/");
  return {};
}
