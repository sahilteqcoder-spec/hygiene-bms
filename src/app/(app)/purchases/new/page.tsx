import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PurchaseForm } from "@/components/forms/purchase-form";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const user = await requireUser();
  if (!isOwner(user.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: products }, { data: suppliers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit, cost_price_paise")
      .is("deleted_at", null)
      .order("name"),
    supabase.from("suppliers").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">New Purchase</h2>
        <p className="text-sm text-muted-foreground">
          Recording a purchase automatically increases stock and updates each product&apos;s cost price.
        </p>
      </div>
      <PurchaseForm products={products ?? []} suppliers={suppliers ?? []} />
    </div>
  );
}
