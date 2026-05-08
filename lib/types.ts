// 物件狀態
export type PropertyStatus = "委託中" | "帶看中" | "議價中" | "成交" | "解除委託";

// 物件類型
export type PropertyType = "買賣" | "租賃";

// 物件
export interface Property {
  id: string;
  title: string;
  address: string;
  district: string; // 行政區
  price: number; // 萬元
  type: PropertyType;
  rooms: number;
  bathrooms: number;
  area: number; // 坪
  floor: string;
  totalFloors: number;
  status: PropertyStatus;
  commissionDeadline: Date;
  description: string;
  images: string[];
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// 客戶分類
export type ClientType = "買方" | "賣方" | "租客" | "房東";

// 客戶狀態
export type ClientStatus = "新客戶" | "追蹤中" | "帶看" | "議價" | "成交" | "流失";

// 客戶
export interface Client {
  id: string;
  name: string;
  phone: string;
  lineId?: string;
  type: ClientType;
  status: ClientStatus;
  budgetMin?: number; // 萬元
  budgetMax?: number; // 萬元
  preferredDistricts: string[];
  requirements: string;
  assignedTo: string;
  lastContactAt: Date;
  createdAt: Date;
}

// 互動紀錄
export type InteractionType = "電話" | "帶看" | "LINE" | "成交" | "其他";

export interface Interaction {
  id: string;
  clientId: string;
  propertyId?: string;
  type: InteractionType;
  note: string;
  createdBy: string;
  createdAt: Date;
}

// 提醒
export type ReminderType = "追蹤客戶" | "委託到期" | "帶看行程" | "自訂";

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  targetId?: string; // clientId 或 propertyId
  remindAt: Date;
  isDone: boolean;
  createdBy: string;
}
