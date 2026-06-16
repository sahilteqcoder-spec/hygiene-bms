"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { purchaseSchema, supplierSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/format";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

// ---- Suppliers --------------------------------------------------------------
export async function saveSupplier(id: string | null, values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isOwner(user.role)) return { ok: false, error: "Owner access required" };

  const parsed = supplierSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const row = { name: v.name, phone: v.phone || null, address: v.address || null, gstin: v.gstin || null };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("suppliers").update(row).eq("id", id)
    : await supabase.from("suppliers").insert(row);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/purchases");
  return { ok: true };
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isOwner(user.role)) return { ok: false, error: "Owner access required" };

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/purchases");
  return { ok: true };
}

// ---- Purchase entry ---------------------------------------------------------
export async function createPurchaseAction(values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isOwner(user.role)) return { ok: false, error: "Owner access required" };

  const parsed = purchaseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_purchase", {
    p_supplier_id: v.supplier_id ?? null,
    p_invoice_no: v.invoice_no || null,
    p_transport_cost_paise: rupeesToPaise(v.transport_cost ?? 0),
    p_items: v.items.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_cost_paise: rupeesToPaise(i.unit_cost),
      batch_no: i.batch_no || null,
      expiry_date: i.expiry_date || null,
    })),
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  return { ok: true, id: data as string };
}
