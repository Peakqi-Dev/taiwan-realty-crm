import { Bell, Building2, LayoutDashboard, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "物件管理", icon: Building2 },
  { href: "/clients", label: "客戶管理", icon: Users },
  { href: "/reminders", label: "提醒事項", icon: Bell },
];
