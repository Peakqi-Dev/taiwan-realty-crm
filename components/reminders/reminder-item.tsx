"use client";

import Link from "next/link";
import { Bell, Calendar, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReminderStore } from "@/hooks/use-reminders";
import { useClientStore } from "@/hooks/use-clients";
import { usePropertyStore } from "@/hooks/use-properties";
import { cn, daysFromNow, formatDate } from "@/lib/utils";
import type { Reminder } from "@/lib/types";

interface ReminderItemProps {
  reminder: Reminder;
  showActions?: boolean;
}

const TYPE_ICON: Record<Reminder["type"], typeof Bell> = {
  追蹤客戶: Bell,
  委託到期: Calendar,
  帶看行程: Calendar,
  自訂: Bell,
};

export function ReminderItem({ reminder, showActions = true }: ReminderItemProps) {
  const toggleDone = useReminderStore((s) => s.toggleDone);
  const remove = useReminderStore((s) => s.remove);
  const findClient = useClientStore((s) => s.getById);
  const findProperty = usePropertyStore((s) => s.getById);

  const Icon = TYPE_ICON[reminder.type];
  const days = daysFromNow(reminder.remindAt);
  const isOverdue = !reminder.isDone && days < 0;
  const isToday = !reminder.isDone && days === 0;

  const linkedHref = (() => {
    if (!reminder.targetId) return null;
    if (findClient(reminder.targetId)) return `/clients/${reminder.targetId}`;
    if (findProperty(reminder.targetId)) return `/properties/${reminder.targetId}`;
    return null;
  })();

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-white p-3 transition-colors",
        reminder.isDone && "opacity-60",
        isOverdue && "border-rose-200 bg-rose-50/40",
        isToday && !isOverdue && "border-amber-200 bg-amber-50/40",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border",
          isOverdue
            ? "border-rose-200 bg-rose-100 text-rose-600"
            : isToday
              ? "border-amber-200 bg-amber-100 text-amber-700"
              : "border-slate-200 bg-slate-50 text-slate-600",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{reminder.type}</p>
        <p
          className={cn(
            "font-medium text-slate-900 truncate",
            reminder.isDone && "line-through",
          )}
        >
          {linkedHref ? (
            <Link href={linkedHref} className="hover:underline">
              {reminder.title}
            </Link>
          ) : (
            reminder.title
          )}
        </p>
        <p
          className={cn(
            "mt-0.5 text-xs",
            isOverdue
              ? "text-rose-600"
              : isToday
                ? "text-amber-700"
                : "text-slate-500",
          )}
        >
          {formatDate(reminder.remindAt)}
          {!reminder.isDone &&
            (isOverdue
              ? ` · 已逾期 ${Math.abs(days)} 天`
              : isToday
                ? " · 今天"
                : ` · 還有 ${days} 天`)}
        </p>
      </div>

      {showActions && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={reminder.isDone ? "標記為未完成" : "標記為完成"}
            onClick={() => toggleDone(reminder.id)}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="刪除"
            onClick={() => remove(reminder.id)}
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
          </Button>
        </div>
      )}
    </div>
  );
}
