import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SaleForm } from "@/components/forms/sale-form";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  await requireAccess("sales");
  const supabase = await createClient();

  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase
      .from("current_stock_view")
      .select("product_id, name, unit, current_stock, selling_price_paise, wholesale_price_paise")
      .order("name"),
    supabase
      .from("customers")
      .select("id, name, customer_type")
      .is("deleted_at", null)
      .order("name"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">New Sale</h2>
        <p className="text-sm text-muted-foreground">Build the bill, then complete the sale to generate an invoice.</p>
      </div>
      <SaleForm products={products ?? []} customers={customers ?? []} />
    </div>
  );
}
