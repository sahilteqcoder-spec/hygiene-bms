import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Root: dashboard (signed in) → setup (no users yet) → login.
export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const supabase = await createClient();
  const { data: hasUsers } = await supabase.rpc("has_any_user");
  redirect(hasUsers ? "/login" : "/setup");
}
