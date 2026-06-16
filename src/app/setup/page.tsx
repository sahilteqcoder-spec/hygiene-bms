import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

// One-time owner creation. If any user already exists, send people to login.
export default async function SetupPage() {
  const supabase = await createClient();
  const { data: exists } = await supabase.rpc("has_any_user");
  if (exists) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <SetupForm />
    </div>
  );
}
