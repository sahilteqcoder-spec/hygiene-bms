import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

// Shared shell for every authenticated module. The middleware already blocks
// unauthenticated access; requireUser() is the belt-and-suspenders guard.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("business_settings")
    .select("business_name")
    .single();

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar role={user.role} businessName={settings?.business_name ?? "Hygiene BMS"} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
