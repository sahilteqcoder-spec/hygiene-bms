"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { settingsSchema, newUserSchema } from "@/lib/validations";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireOwner() {
  const user = await getCurrentUser();
  if (!user || !isOwner(user.role)) throw new Error("Owner access required");
  return user;
}

export async function updateSettings(values: unknown): Promise<ActionResult> {
  try {
    await requireOwner();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_settings")
    .update({
      business_name: v.business_name,
      address: v.address || null,
      phone: v.phone || null,
      email: v.email || null,
      gstin: v.gstin || null,
      state: v.state || null,
      state_code: v.state_code || null,
      invoice_prefix: v.invoice_prefix,
      default_gst_rate: v.default_gst_rate,
    })
    .eq("id", true);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

// ---- Business logo ----------------------------------------------------------
export async function uploadLogo(formData: FormData): Promise<ActionResult> {
  try {
    await requireOwner();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image file" };
  if (file.size > 2_000_000) return { ok: false, error: "Image must be under 2 MB" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Only image files are allowed" };

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `logo-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const supabase = await createClient();
  const { error: upErr } = await supabase.storage
    .from("branding")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
  const { error } = await supabase
    .from("business_settings")
    .update({ logo_url: pub.publicUrl })
    .eq("id", true);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function removeLogo(): Promise<ActionResult> {
  try {
    await requireOwner();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("business_settings").update({ logo_url: null }).eq("id", true);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function createUser(values: unknown): Promise<ActionResult> {
  try {
    await requireOwner();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const parsed = newUserSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  // Service-role: create the auth user. The on_auth_user_created trigger then
  // inserts the matching public.users profile with the role from metadata.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { name: v.name, role: v.role },
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateUserRole(userId: string, role: "owner" | "staff"): Promise<ActionResult> {
  try {
    await requireOwner();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
