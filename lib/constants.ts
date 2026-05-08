import type {
  ClientStatus,
  ClientType,
  InteractionType,
  PropertyStatus,
  PropertyType,
  ReminderType,
} from "./types";

export const CURRENT_USER = {
  id: "agent-001",
  name: "陳俊豪",
  email: "demo@taiwan-realty.tw",
  phone: "0912-345-678",
  avatar: "",
};

// 台北市常見行政區
export const TAIPEI_DISTRICTS = [
  "中正區",
  "大同區",
  "中山區",
  "松山區",
  "大安區",
  "萬華區",
  "信義區",
  "士林區",
  "北投區",
  "內湖區",
  "南港區",
  "文山區",
] as const;

export const PROPERTY_STATUSES: PropertyStatus[] = [
  "委託中",
  "帶看中",
  "議價中",
  "成交",
  "解除委託",
];

export const PROPERTY_TYPES: PropertyType[] = ["買賣", "租賃"];

export const CLIENT_STATUSES: ClientStatus[] = [
  "新客戶",
  "追蹤中",
  "帶看",
  "議價",
  "成交",
  "流失",
];

export const CLIENT_TYPES: ClientType[] = ["買方", "賣方", "租客", "房東"];

export const INTERACTION_TYPES: InteractionType[] = ["電話", "帶看", "LINE", "成交", "其他"];

export const REMINDER_TYPES: ReminderType[] = ["追蹤客戶", "委託到期", "帶看行程", "自訂"];

// 各狀態對應的色票（badge / 強調色）
export const PROPERTY_STATUS_COLOR: Record<PropertyStatus, string> = {
  委託中: "bg-blue-100 text-blue-700 border-blue-200",
  帶看中: "bg-amber-100 text-amber-700 border-amber-200",
  議價中: "bg-purple-100 text-purple-700 border-purple-200",
  成交: "bg-emerald-100 text-emerald-700 border-emerald-200",
  解除委託: "bg-slate-200 text-slate-600 border-slate-300",
};

export const CLIENT_STATUS_COLOR: Record<ClientStatus, string> = {
  新客戶: "bg-sky-100 text-sky-700 border-sky-200",
  追蹤中: "bg-blue-100 text-blue-700 border-blue-200",
  帶看: "bg-amber-100 text-amber-700 border-amber-200",
  議價: "bg-purple-100 text-purple-700 border-purple-200",
  成交: "bg-emerald-100 text-emerald-700 border-emerald-200",
  流失: "bg-rose-100 text-rose-700 border-rose-200",
};
