"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { saleSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/format";

export interface CreateSaleResult {
  ok: boolean;
  error?: string;
  saleId?: string;
  invoiceNo?: string;
}

export async function createSaleAction(values: unknown): Promise<CreateSaleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = saleSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_sale", {
    p_customer_id: v.customer_id ?? null,
    p_payment_mode: v.payment_mode,
    p_discount_paise: rupeesToPaise(v.discount ?? 0),
    p_items: v.items,
  });

  if (error) return { ok: false, error: error.message };
  const result = Array.isArray(data) ? data[0] : data;

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true, saleId: result?.sale_id, invoiceNo: result?.invoice_no };
}

export async function deleteSaleAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const supabase = await createClient();
  // delete_sale restores stock and removes the sale + its items atomically.
  const { error } = await supabase.rpc("delete_sale", { p_sale_id: id });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true };
}
