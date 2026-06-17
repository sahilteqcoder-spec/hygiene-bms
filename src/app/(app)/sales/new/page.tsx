import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SaleForm } from "@/components/forms/sale-form";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  await requireAccess("sales");
  const supabase = await createClient();

  const [{ data: stock }, { data: customers }, { data: tiers }] = await Promise.all([
    supabase
      .from("current_stock_view")
      .select("product_id, name, unit, current_stock, selling_price_paise")
      .order("name"),
    supabase
      .from("customers")
      .select("id, name, customer_type")
      .is("deleted_at", null)
      .order("name"),
    supabase.from("product_price_tiers").select("product_id, min_quantity, price_paise"),
  ]);

  // Attach each product's quantity price tiers.
  const tiersByProduct: Record<string, { min_quantity: number; price_paise: number }[]> = {};
  for (const t of tiers ?? []) {
    (tiersByProduct[t.product_id] ??= []).push({ min_quantity: t.min_quantity, price_paise: t.price_paise });
  }
  const products = (stock ?? []).map((p) => ({
    product_id: p.product_id,
    name: p.name,
    unit: p.unit,
    current_stock: p.current_stock,
    selling_price_paise: p.selling_price_paise,
    tiers: tiersByProduct[p.product_id] ?? [],
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">New Sale</h2>
        <p className="text-sm text-muted-foreground">Build the bill, then complete the sale to generate an invoice.</p>
      </div>
      <SaleForm products={products} customers={customers ?? []} />
    </div>
  );
}
