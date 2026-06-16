"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { customerSchema, paymentSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/format";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function saveCustomer(id: string | null, values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const row = {
    name: v.name,
    phone: v.phone || null,
    address: v.address || null,
    customer_type: v.customer_type,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("customers").update(row).eq("id", id)
    : await supabase.from("customers").insert(row);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/customers");
  return { ok: true };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/customers");
  return { ok: true };
}

export async function recordPayment(values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("customer_payments").insert({
    customer_id: v.customer_id,
    amount_paise: rupeesToPaise(v.amount),
    note: v.note || null,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/customers/${v.customer_id}`);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true };
}
