"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { productSchema, type ProductFormValues } from "@/lib/validations";
import { saveProduct } from "@/app/(app)/inventory/actions";
import { paiseToRupees } from "@/lib/format";
import type { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ProductForm({ product, trigger }: { product?: Product; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          brand: product.brand ?? "",
          size: product.size ?? "",
          type: product.type ?? "",
          unit: product.unit,
          selling_price: paiseToRupees(product.selling_price_paise),
          wholesale_price: paiseToRupees(product.wholesale_price_paise),
          cost_price: paiseToRupees(product.cost_price_paise),
          reorder_point: product.reorder_point,
          gst_rate: product.gst_rate,
          hsn_code: product.hsn_code ?? "",
        }
      : { unit: "piece", reorder_point: 0, gst_rate: 0 },
  });

  async function onSubmit(values: ProductFormValues) {
    const res = await saveProduct(product?.id ?? null, values);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Could not save", description: res.error });
      return;
    }
    toast({ variant: "success", title: product ? "Product updated" : "Product added" });
    setOpen(false);
    if (!product) reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>Prices are entered in rupees.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Name" error={errors.name?.message}>
              <Input {...register("name")} placeholder="Whisper Ultra Clean XL" />
            </Field>
          </div>
          <Field label="Brand" error={errors.brand?.message}>
            <Input {...register("brand")} placeholder="Whisper" />
          </Field>
          <Field label="Type" error={errors.type?.message}>
            <Input {...register("type")} placeholder="Sanitary Pad" />
          </Field>
          <Field label="Size" error={errors.size?.message}>
            <Input {...register("size")} placeholder="XL" />
          </Field>
          <Field label="Unit" error={errors.unit?.message}>
            <Input {...register("unit")} placeholder="pack" />
          </Field>
          <Field label="Selling price (₹)" error={errors.selling_price?.message}>
            <Input type="number" step="0.01" {...register("selling_price")} />
          </Field>
          <Field label="Wholesale price (₹)" error={errors.wholesale_price?.message}>
            <Input type="number" step="0.01" {...register("wholesale_price")} />
          </Field>
          <Field label="Cost price (₹)" error={errors.cost_price?.message}>
            <Input type="number" step="0.01" {...register("cost_price")} />
          </Field>
          <Field label="Reorder point" error={errors.reorder_point?.message}>
            <Input type="number" {...register("reorder_point")} />
          </Field>
          <Field label="GST rate (%)" error={errors.gst_rate?.message}>
            <Input type="number" step="0.01" {...register("gst_rate")} />
          </Field>
          <Field label="HSN code" error={errors.hsn_code?.message}>
            <Input {...register("hsn_code")} placeholder="9619" />
          </Field>
          <DialogFooter className="col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
