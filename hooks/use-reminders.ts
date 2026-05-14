"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { Reminder, ReminderType } from "@/lib/types";
import { createClient as createSupabase } from "@/lib/supabase/client";

interface ReminderRow {
  id: string;
  type: ReminderType;
  title: string;
  target_id: string | null;
  remind_at: string;
  is_done: boolean;
  created_by: string;
}

export function rowToReminder(r: ReminderRow): Reminder {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    targetId: r.target_id ?? undefined,
    remindAt: new Date(r.remind_at),
    isDone: r.is_done,
    createdBy: r.created_by,
  };
}

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  initialized: boolean;
  loadAll: () => Promise<void>;
  refresh: () => Promise<void>;
  setOne: (reminder: Reminder) => void;
  removeOne: (id: string) => void;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  isLoading: false,
  initialized: false,
  loadAll: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    const supabase = createSupabase();
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .order("remind_at", { ascending: true });
    if (error) {
      console.error("[useReminders] loadAll failed:", error.message);
      set({ isLoading: false });
      return;
    }
    set({
      reminders: (data as ReminderRow[]).map(rowToReminder),
      isLoading: false,
      initialized: true,
    });
  },
  refresh: async () => {
    set({ initialized: false });
    await get().loadAll();
  },
  setOne: (reminder) =>
    set((s) => {
      const idx = s.reminders.findIndex((r) => r.id === reminder.id);
      if (idx === -1) return { reminders: [reminder, ...s.reminders] };
      const next = s.reminders.slice();
      next[idx] = reminder;
      return { reminders: next };
    }),
  removeOne: (id) =>
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),
}));

export function useReminders() {
  const reminders = useReminderStore((s) => s.reminders);
  const initialized = useReminderStore((s) => s.initialized);
  const loadAll = useReminderStore((s) => s.loadAll);
  useEffect(() => {
    if (!initialized) loadAll();
  }, [initialized, loadAll]);
  return reminders;
}
