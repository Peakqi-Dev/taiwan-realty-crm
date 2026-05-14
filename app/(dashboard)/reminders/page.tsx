"use client";

import { useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReminderItem } from "@/components/reminders/reminder-item";
import { useReminders, useReminderStore } from "@/hooks/use-reminders";
import {
  createReminderAction,
  type ReminderActionState,
} from "@/app/(dashboard)/reminders/actions";
import { REMINDER_TYPES } from "@/lib/constants";
import type { Reminder, ReminderType } from "@/lib/types";
import { daysFromNow } from "@/lib/utils";
import { toast } from "sonner";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full md:w-auto" disabled={pending}>
      <Plus className="mr-1 h-4 w-4" />
      {pending ? "建立中..." : "建立"}
    </Button>
  );
}

export default function RemindersPage() {
  const reminders = useReminders();
  const refresh = useReminderStore((s) => s.refresh);
  const formRef = useRef<HTMLFormElement>(null);

  const [type, setType] = useState<ReminderType>("自訂");

  const [state, formAction] = useFormState<ReminderActionState, FormData>(
    async (prev, formData) => {
      const result = await createReminderAction(prev, formData);
      if (!result?.error) {
        await refresh();
        formRef.current?.reset();
        toast.success("提醒已建立");
      } else {
        toast.error(result.error);
      }
      return result ?? {};
    },
    {},
  );

  const grouped = useMemo(() => {
    const overdue: Reminder[] = [];
    const today: Reminder[] = [];
    const upcoming: Reminder[] = [];
    const done: Reminder[] = [];
    const sorted = [...reminders].sort(
      (a, b) => a.remindAt.getTime() - b.remindAt.getTime(),
    );
    for (const r of sorted) {
      if (r.isDone) {
        done.push(r);
        continue;
      }
      const d = daysFromNow(r.remindAt);
      if (d < 0) overdue.push(r);
      else if (d === 0) today.push(r);
      else upcoming.push(r);
    }
    return { overdue, today, upcoming, done };
  }, [reminders]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">提醒事項</h2>
        <p className="text-sm text-slate-500">追蹤客戶、委託到期與帶看行程</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 font-medium text-slate-900">新增提醒</h3>
          <form
            ref={formRef}
            action={formAction}
            className="grid gap-3 md:grid-cols-[160px_1fr_180px_auto]"
          >
            <input type="hidden" name="type" value={type} />
            <div className="space-y-1.5">
              <Label>類型</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ReminderType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">提醒內容</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="例:聯繫王俊傑確認週末帶看時段"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="remindAt">提醒日期</Label>
              <Input
                id="remindAt"
                name="remindAt"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex items-end">
              <SubmitButton />
            </div>
          </form>
          {state.error && (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {state.error}
            </p>
          )}
        </CardContent>
      </Card>

      <Section title="已逾期" items={grouped.overdue} />
      <Section title="今天" items={grouped.today} />
      <Section title="即將到來" items={grouped.upcoming} />
      <Section title="已完成" items={grouped.done} />
    </div>
  );
}

interface SectionProps {
  title: string;
  items: Reminder[];
}

function Section({ title, items }: SectionProps) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">
        {title}{" "}
        <span className="text-xs text-slate-500">({items.length})</span>
      </p>
      <div className="space-y-2">
        {items.map((r) => (
          <ReminderItem key={r.id} reminder={r} />
        ))}
      </div>
    </div>
  );
}
