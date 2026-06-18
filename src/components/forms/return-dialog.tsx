"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { formatPaise } from "@/lib/format";
import { createReturnAction } from "@/app/(app)/sales/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export interface ReturnableItem {
  product_id: string;
  name: string;
  sold: number;
  returned: number;
  unit_price_paise: number;
}

export function ReturnDialog({ saleId, items }: { saleId: string; items: ReturnableItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const returnable = items.filter((i) => i.sold - i.returned > 0);
  const refundPaise = returnable.reduce(
    (s, i) => s + (qty[i.product_id] || 0) * i.unit_price_paise,
    0
  );

  function setLine(id: string, val: number, max: number) {
    setQty((prev) => ({ ...prev, [id]: Math.max(0, Math.min(val || 0, max)) }));
  }

  async function submit() {
    const payload = returnable
      .map((i) => ({ product_id: i.product_id, quantity: qty[i.product_id] || 0, unit_price_paise: i.unit_price_paise }))
      .filter((i) => i.quantity > 0);
    if (payload.length === 0) {
      toast({ variant: "destructive", title: "Enter a quantity to return" });
      return;
    }
    setBusy(true);
    const res = await createReturnAction(saleId, payload, note);
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Return failed", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Return recorded", description: "Stock restored." });
    setOpen(false);
    setQty({});
    setNote("");
    router.refresh();
  }

  if (returnable.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Undo2 className="h-4 w-4" /> Return / Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return items</DialogTitle>
          <DialogDescription>Returned items are added back to stock.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {returnable.map((i) => {
            const max = i.sold - i.returned;
            return (
              <div key={i.product_id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {max} of {i.sold} returnable · {formatPaise(i.unit_price_paise)}/pc
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={max}
                  value={qty[i.product_id] ?? 0}
                  onChange={(e) => setLine(i.product_id, Number(e.target.value), max)}
                  className="w-20"
                />
              </div>
            );
          })}
        </div>

        <div className="space-y-1">
          <Label>Reason / note</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Damaged, wrong item…" />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm">Refund: <span className="font-semibold">{formatPaise(refundPaise)}</span></span>
          <Button onClick={submit} disabled={busy || refundPaise === 0}>
            {busy ? "Processing…" : "Confirm return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
