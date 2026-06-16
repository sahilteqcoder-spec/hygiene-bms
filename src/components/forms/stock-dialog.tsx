"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { stockSchema, type StockFormValues } from "@/lib/validations";
import { addStockEntry } from "@/app/(app)/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  productId: string;
  productName: string;
  type: "in" | "out";
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function StockDialog({ productId, productName, type, open, onOpenChange }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: { product_id: productId, type, quantity: 1 },
  });

  async function onSubmit(values: StockFormValues) {
    const res = await addStockEntry({ ...values, product_id: productId, type });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Failed", description: res.error });
      return;
    }
    toast({ variant: "success", title: type === "in" ? "Stock added" : "Stock removed" });
    reset({ product_id: productId, type, quantity: 1 });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "in" ? "Stock In" : "Stock Out"} — {productName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input type="number" min={1} {...register("quantity")} />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
          </div>
          {type === "in" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Batch no.</Label>
                <Input {...register("batch_no")} placeholder="WH-2407" />
              </div>
              <div className="space-y-1">
                <Label>Expiry date</Label>
                <Input type="date" {...register("expiry_date")} />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label>Note</Label>
            <Textarea {...register("note")} placeholder="Reason / reference" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
