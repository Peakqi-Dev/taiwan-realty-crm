"use client";

import { useMemo, useState, type FormEvent } from "react";
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
import { useReminderStore } from "@/hooks/use-reminders";
import { CURRENT_USER, REMINDER_TYPES } from "@/lib/constants";
import type { ReminderType } from "@/lib/types";
import { daysFromNow } from "@/lib/utils";
import { toast } from "sonner";

export default function RemindersPage() {
  const reminders = useReminderStore((s) => s.reminders);
  const add = useReminderStore((s) => s.add);

  const [type, setType] = useState<ReminderType>("自訂");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const grouped = useMemo(() => {
    const overdue: typeof reminders = [];
    const today: typeof reminders = [];
    const upcoming: typeof reminders = [];
    const done: typeof reminders = [];
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

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("請輸入提醒內容");
      return;
    }
    add({
      type,
      title: title.trim(),
      remindAt: new Date(date),
      createdBy: CURRENT_USER.id,
    });
    setTitle("");
    toast.success("提醒已建立");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">提醒事項</h2>
        <p className="text-sm text-slate-500">追蹤客戶、委託到期與帶看行程</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 font-medium text-slate-900">新增提醒</h3>
          <form onSubmit={onAdd} className="grid gap-3 md:grid-cols-[160px_1fr_180px_auto]">
            <div className="space-y-1.5">
              <Label>類型</Label>
              <Select value={type} onValueChange={(v) => setType(v as ReminderType)}>
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例:聯繫王俊傑確認週末帶看時段"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">提醒日期</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto">
                <Plus className="mr-1 h-4 w-4" />
                建立
              </Button>
            </div>
          </form>
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
  items: ReturnType<typeof useReminderStore.getState>["reminders"];
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
