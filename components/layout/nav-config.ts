import {
  Bell,
  Building2,
  LayoutDashboard,
  MessagesSquare,
  QrCode,
  UserCircle,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/conversations", label: "對話管理", icon: MessagesSquare },
  { href: "/properties", label: "物件管理", icon: Building2 },
  { href: "/clients", label: "客戶管理", icon: Users },
  { href: "/reminders", label: "提醒事項", icon: Bell },
  { href: "/app/qr", label: "我的 QR", icon: QrCode },
  { href: "/app/profile", label: "個人資料", icon: UserCircle },
];
