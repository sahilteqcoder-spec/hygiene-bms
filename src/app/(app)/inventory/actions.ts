"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { productSchema, stockSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/format";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// ---- Product CRUD -----------------------------------------------------------
export async function saveProduct(
  id: string | null,
  values: unknown
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = productSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const row = {
    name: v.name,
    brand: v.brand || null,
    size: v.size || null,
    type: v.type || null,
    unit: v.unit,
    selling_price_paise: rupeesToPaise(v.selling_price),
    wholesale_price_paise: rupeesToPaise(v.wholesale_price ?? 0),
    cost_price_paise: rupeesToPaise(v.cost_price),
    reorder_point: v.reorder_point,
    gst_rate: v.gst_rate,
    hsn_code: v.hsn_code || null,
  };

  const supabase = await createClient();

  let productId = id;
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase.from("products").insert(row).select("id").single();
    if (error) return { ok: false, error: error.message };
    productId = data.id;
  }

  // Replace the product's quantity price tiers with the submitted set.
  if (productId) {
    await supabase.from("product_price_tiers").delete().eq("product_id", productId);
    const tiers = (v.tiers ?? [])
      .filter((t) => t.min_quantity >= 1)
      .map((t) => ({
        product_id: productId!,
        min_quantity: t.min_quantity,
        price_paise: rupeesToPaise(t.price),
      }));
    if (tiers.length) {
      const { error } = await supabase.from("product_price_tiers").insert(tiers);
      if (error) return { ok: false, error: error.message };
    }
  }

  revalidatePath("/inventory");
  revalidatePath("/sales/new");
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // Soft delete so historical sales/purchases keep referencing the product.
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  return { ok: true };
}

// ---- Stock movement ---------------------------------------------------------
export async function addStockEntry(values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = stockSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();

  // Guard against overselling on a manual stock-out.
  if (v.type === "out") {
    const { data: stock } = await supabase
      .from("current_stock_view")
      .select("current_stock")
      .eq("product_id", v.product_id)
      .single();
    if ((stock?.current_stock ?? 0) < v.quantity) {
      return { ok: false, error: `Only ${stock?.current_stock ?? 0} in stock` };
    }
  }

  const { error } = await supabase.from("stock_entries").insert({
    product_id: v.product_id,
    type: v.type,
    quantity: v.quantity,
    batch_no: v.batch_no || null,
    expiry_date: v.expiry_date || null,
    note: v.note || null,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  return { ok: true };
}
