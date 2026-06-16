"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { productSchema, type ProductFormValues } from "@/lib/validations";
import { saveProduct } from "@/app/(app)/inventory/actions";
import { paiseToRupees } from "@/lib/format";
import type { Product, PriceTier } from "@/types/product";
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

export function ProductForm({
  product,
  tiers,
  trigger,
}: {
  product?: Product;
  tiers?: PriceTier[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    watch,
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
          tiers: (tiers ?? [])
            .slice()
            .sort((a, b) => a.min_quantity - b.min_quantity)
            .map((t) => ({ min_quantity: t.min_quantity, price: paiseToRupees(t.price_paise) })),
        }
      : { unit: "piece", reorder_point: 0, gst_rate: 0, tiers: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "tiers" });
  const watchedTiers = watch("tiers");

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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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
          <Field label="Base price (₹)" error={errors.selling_price?.message}>
            <Input type="number" step="0.01" {...register("selling_price")} />
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

          {/* Quantity price tiers */}
          <div className="col-span-2 space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Quantity price tiers</Label>
                <p className="text-xs text-muted-foreground">
                  Buy ≥ this quantity → this <strong>per-piece</strong> price. Below the smallest
                  tier, the Base price applies. Example: for 20 pieces to total ₹130, enter 6.50
                  (= 130 ÷ 20).
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ min_quantity: 1, price: 0 })}
              >
                <Plus className="h-4 w-4" /> Add tier
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                No tiers — every quantity uses the Base price.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
                  <span className="col-span-5">Min quantity</span>
                  <span className="col-span-6">Unit price (₹/piece)</span>
                  <span className="col-span-1" />
                </div>
                {fields.map((f, i) => {
                  const q = Number(watchedTiers?.[i]?.min_quantity) || 0;
                  const up = Number(watchedTiers?.[i]?.price) || 0;
                  const lineTotal = q * up;
                  return (
                    <div key={f.id} className="space-y-1">
                      <div className="grid grid-cols-12 items-center gap-2">
                        <div className="col-span-5">
                          <Input type="number" min={1} {...register(`tiers.${i}.min_quantity` as const)} />
                        </div>
                        <div className="col-span-6">
                          <Input type="number" step="0.01" {...register(`tiers.${i}.price` as const)} />
                        </div>
                        <div className="col-span-1 text-right">
                          <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {q > 0 && up > 0 && (
                        <p className="pl-1 text-xs text-emerald-600">
                          = ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for {q} pieces
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
