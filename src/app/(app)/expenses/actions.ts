"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { expenseSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/format";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function saveExpense(id: string | null, values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isOwner(user.role)) return { ok: false, error: "Owner access required" };

  const parsed = expenseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const row = {
    category: v.category,
    amount_paise: rupeesToPaise(v.amount),
    note: v.note || null,
    date: v.date,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("expenses").update(row).eq("id", id)
    : await supabase.from("expenses").insert({ ...row, created_by: user.id });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isOwner(user.role)) return { ok: false, error: "Owner access required" };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true };
}
