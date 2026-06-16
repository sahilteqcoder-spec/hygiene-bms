import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "@/components/forms/settings-form";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!isOwner(user.role)) redirect("/dashboard"); // Settings = owner only

  const supabase = await createClient();
  const [{ data: settings }, { data: users }] = await Promise.all([
    supabase.from("business_settings").select("*").single(),
    supabase.from("users").select("id, name, email, role").order("created_at"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Business profile, GST configuration and staff accounts.</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business &amp; GST</TabsTrigger>
          <TabsTrigger value="users">Users &amp; Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="business" className="mt-4">
          {settings && <SettingsForm settings={settings} />}
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersManager users={users ?? []} currentUserId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
