"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { settingsSchema, type SettingsFormValues } from "@/lib/validations";
import { updateSettings } from "@/app/(app)/settings/actions";
import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Settings = Database["public"]["Tables"]["business_settings"]["Row"];

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      business_name: settings.business_name,
      address: settings.address ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      gstin: settings.gstin ?? "",
      state: settings.state ?? "",
      state_code: settings.state_code ?? "",
      invoice_prefix: settings.invoice_prefix,
      default_gst_rate: settings.default_gst_rate,
    },
  });

  async function onSubmit(values: SettingsFormValues) {
    const res = await updateSettings(values);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Could not save", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Settings saved" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Business Profile</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business name" error={errors.business_name?.message}>
            <Input {...register("business_name")} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input {...register("email")} />
          </Field>
          <Field label="Invoice prefix" error={errors.invoice_prefix?.message}>
            <Input {...register("invoice_prefix")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" error={errors.address?.message}>
              <Textarea {...register("address")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>GST Settings</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="GSTIN" error={errors.gstin?.message}>
            <Input {...register("gstin")} placeholder="24ABCDE1234F1Z5" />
          </Field>
          <Field label="State" error={errors.state?.message}>
            <Input {...register("state")} placeholder="Gujarat" />
          </Field>
          <Field label="State code" error={errors.state_code?.message}>
            <Input {...register("state_code")} placeholder="24" />
          </Field>
          <Field label="Default GST rate (%)" error={errors.default_gst_rate?.message}>
            <Input type="number" step="0.01" {...register("default_gst_rate")} />
          </Field>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
