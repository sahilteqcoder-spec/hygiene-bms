import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Receipt,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { AppModule } from "@/lib/permissions";

export interface NavItem {
  module: AppModule;
  href: string;
  label: string;
  icon: LucideIcon;
}

// Shared navigation list used by both the desktop Sidebar and the mobile drawer.
export const NAV: NavItem[] = [
  { module: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { module: "inventory", href: "/inventory", label: "Inventory", icon: Package },
  { module: "sales", href: "/sales", label: "Sales", icon: ShoppingCart },
  { module: "purchases", href: "/purchases", label: "Purchases", icon: Truck },
  { module: "customers", href: "/customers", label: "Customers", icon: Users },
  { module: "expenses", href: "/expenses", label: "Expenses", icon: Receipt },
  { module: "reports", href: "/reports", label: "Reports", icon: BarChart3 },
  { module: "settings", href: "/settings", label: "Settings", icon: Settings },
];
