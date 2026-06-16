"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { newUserSchema } from "@/lib/validations";

export interface SetupResult {
  error?: string;
}

// Creates the very first OWNER account. Guarded by has_any_user() so it can only
// run while the system has no users — afterwards it refuses.
export async function createFirstOwner(_prev: SetupResult, formData: FormData): Promise<SetupResult> {
  const supabase = await createClient();
  const { data: exists } = await supabase.rpc("has_any_user");
  if (exists) return { error: "Setup is already complete. Please sign in." };

  const parsed = newUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: "owner",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { name: v.name, role: "owner" },
  });
  if (error) return { error: error.message };

  redirect("/login?setup=done");
}
