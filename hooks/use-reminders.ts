"use client";

import { create } from "zustand";
import type { Reminder } from "@/lib/types";
import { mockReminders } from "@/lib/mock-data";

type NewReminder = Omit<Reminder, "id" | "isDone"> & { isDone?: boolean };

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  add: (input: NewReminder) => Reminder;
  toggleDone: (id: string) => void;
  remove: (id: string) => void;
}

export const useReminderStore = create<ReminderState>((set) => ({
  reminders: mockReminders,
  isLoading: false,
  add: (input) => {
    const reminder: Reminder = {
      ...input,
      id: `r-${Date.now()}`,
      isDone: input.isDone ?? false,
    };
    set((s) => ({ reminders: [reminder, ...s.reminders] }));
    return reminder;
  },
  toggleDone: (id) =>
    set((s) => ({
      reminders: s.reminders.map((r) =>
        r.id === id ? { ...r, isDone: !r.isDone } : r,
      ),
    })),
  remove: (id) =>
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),
}));

export const useReminders = () => useReminderStore((s) => s.reminders);
