import type { UserRole } from "@/types/database";

// Centralized authorization map. The database (RLS) is the source of truth;
// this mirrors it for UI gating (hiding nav items, disabling actions) so we
// never render something the API would reject anyway.

export type AppModule =
  | "dashboard"
  | "inventory"
  | "sales"
  | "purchases"
  | "customers"
  | "expenses"
  | "reports"
  | "settings";

// Which modules each role may open.
const ROLE_MODULES: Record<UserRole, AppModule[]> = {
  owner: [
    "dashboard",
    "inventory",
    "sales",
    "purchases",
    "customers",
    "expenses",
    "reports",
    "settings",
  ],
  // Staff: Dashboard (limited), Inventory, Sales, Customers.
  staff: ["dashboard", "inventory", "sales", "customers"],
};

export function canAccess(role: UserRole | undefined, module: AppModule): boolean {
  if (!role) return false;
  return ROLE_MODULES[role].includes(module);
}

export function isOwner(role: UserRole | undefined): boolean {
  return role === "owner";
}

// Throw-style guard for server code (pages / route handlers).
export function assertCanAccess(role: UserRole | undefined, module: AppModule) {
  if (!canAccess(role, module)) {
    throw new Error(`Forbidden: ${role ?? "guest"} cannot access ${module}`);
  }
}
