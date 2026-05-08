import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isValid } from "date-fns";
import { zhTW } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 將「萬元」金額格式化為顯示字串：1280 → "1,280 萬"；超過 10000 則轉換為「億」。 */
export function formatPriceWan(wan: number): string {
  if (!Number.isFinite(wan)) return "-";
  if (wan >= 10000) {
    const yi = wan / 10000;
    const trimmed = Number.isInteger(yi) ? yi.toFixed(0) : yi.toFixed(2);
    return `${trimmed} 億`;
  }
  return `${wan.toLocaleString("zh-TW")} 萬`;
}

/** 預算區間：min/max 任一為 undefined 也能顯示。 */
export function formatBudgetRange(min?: number, max?: number): string {
  if (min == null && max == null) return "未指定";
  if (min != null && max != null) return `${formatPriceWan(min)} - ${formatPriceWan(max)}`;
  if (min != null) return `${formatPriceWan(min)} 起`;
  return `至 ${formatPriceWan(max as number)}`;
}

/** 標準日期顯示：2026/05/08。 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return isValid(d) ? format(d, "yyyy/MM/dd", { locale: zhTW }) : "-";
}

export function formatDateTime(date: Date | string | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return isValid(d) ? format(d, "yyyy/MM/dd HH:mm", { locale: zhTW }) : "-";
}

/** 相對時間：3 小時前、2 天前。 */
export function formatRelative(date: Date | string | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "-";
  return formatDistanceToNow(d, { addSuffix: true, locale: zhTW });
}

/** 距今 N 天（負值表示已過期）。 */
export function daysFromNow(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
