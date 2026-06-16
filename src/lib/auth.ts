import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import { canAccess, type AppModule } from "@/lib/permissions";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Cached per-request: the current user's auth identity + app profile (role).
// Returns null when not authenticated.
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, name, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Auth user exists but no profile row yet (trigger lag). Fall back to email.
    return {
      id: user.id,
      email: user.email ?? "",
      name: user.email?.split("@")[0] ?? "User",
      role: "staff",
    };
  }
  return profile as AppUser;
});

// Use in protected pages/layouts: redirects to /login when signed out.
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Use at the top of a protected page: redirects to /dashboard if the user's
// role may not access the given module.
export async function requireAccess(module: AppModule): Promise<AppUser> {
  const user = await requireUser();
  if (!canAccess(user.role, module)) redirect("/dashboard");
  return user;
}
