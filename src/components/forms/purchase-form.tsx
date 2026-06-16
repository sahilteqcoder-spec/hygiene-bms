"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Truck } from "lucide-react";
import { formatPaise, rupeesToPaise } from "@/lib/format";
import { createPurchaseAction } from "@/app/(app)/purchases/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface ProductOption {
  id: string;
  name: string;
  unit: string;
  cost_price_paise: number;
}
interface SupplierOption {
  id: string;
  name: string;
}
interface Line {
  product_id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_cost: number; // rupees
  batch_no: string;
  expiry_date: string;
}
interface Charge {
  label: string;
  amount: number; // rupees
}

export function PurchaseForm({
  products,
  suppliers,
}: {
  products: ProductOption[];
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id ?? "none");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [charges, setCharges] = useState<Charge[]>([{ label: "Transport", amount: 0 }]);
  const [lines, setLines] = useState<Line[]>([]);
  const [picker, setPicker] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const available = useMemo(
    () => products.filter((p) => !lines.some((l) => l.product_id === p.id)),
    [products, lines]
  );

  function addProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setLines((prev) => [
      ...prev,
      {
        product_id: p.id,
        name: p.name,
        unit: p.unit,
        quantity: 1,
        unit_cost: p.cost_price_paise / 100,
        batch_no: "",
        expiry_date: "",
      },
    ]);
    setPicker("");
  }
  function update(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.product_id === id ? { ...l, ...patch } : l)));
  }
  function remove(id: string) {
    setLines((prev) => prev.filter((l) => l.product_id !== id));
  }

  function updateCharge(i: number, patch: Partial<Charge>) {
    setCharges((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addCharge() {
    setCharges((prev) => [...prev, { label: "", amount: 0 }]);
  }
  function removeCharge(i: number) {
    setCharges((prev) => prev.filter((_, idx) => idx !== i));
  }

  const itemsTotal = lines.reduce((s, l) => s + l.quantity * rupeesToPaise(l.unit_cost), 0);
  const chargesTotal = charges.reduce((s, c) => s + rupeesToPaise(Number(c.amount) || 0), 0);
  const grandTotal = itemsTotal + chargesTotal;

  async function submit() {
    if (lines.length === 0) {
      toast({ variant: "destructive", title: "Add at least one product" });
      return;
    }
    setSubmitting(true);
    const res = await createPurchaseAction({
      supplier_id: supplierId === "none" ? null : supplierId,
      invoice_no: invoiceNo,
      charges: charges
        .filter((c) => c.label.trim() && Number(c.amount) > 0)
        .map((c) => ({ label: c.label.trim(), amount: Number(c.amount) })),
      items: lines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        unit_cost: l.unit_cost,
        batch_no: l.batch_no,
        expiry_date: l.expiry_date,
      })),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Purchase failed", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Purchase recorded, stock updated" });
    router.push("/purchases");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No supplier</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Supplier invoice no.</Label>
            <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="PINV-1234" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <Label>Add product</Label>
          <Select value={picker} onValueChange={addProduct}>
            <SelectTrigger><SelectValue placeholder="Select a product…" /></SelectTrigger>
            <SelectContent>
              {available.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-2">
            {lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No items yet.</p>
            ) : (
              lines.map((l) => (
                <div key={l.product_id} className="grid grid-cols-12 items-end gap-2 rounded-md border p-2">
                  <div className="col-span-12 sm:col-span-3">
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.unit}</div>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={1} value={l.quantity} onChange={(e) => update(l.product_id, { quantity: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-xs">Cost (₹)</Label>
                    <Input type="number" step="0.01" value={l.unit_cost} onChange={(e) => update(l.product_id, { unit_cost: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Label className="text-xs">Batch</Label>
                    <Input value={l.batch_no} onChange={(e) => update(l.product_id, { batch_no: e.target.value })} />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Label className="text-xs">Expiry</Label>
                    <Input type="date" value={l.expiry_date} onChange={(e) => update(l.product_id, { expiry_date: e.target.value })} />
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(l.product_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Purchasing expenses */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Purchasing expenses</Label>
              <p className="text-xs text-muted-foreground">Transport, loading, GST, etc. — all added to the purchase total.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addCharge}>
              <Plus className="h-4 w-4" /> Add charge
            </Button>
          </div>
          {charges.map((c, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-7">
                <Input placeholder="Label (e.g. Transport)" value={c.label} onChange={(e) => updateCharge(i, { label: e.target.value })} />
              </div>
              <div className="col-span-4">
                <Input type="number" step="0.01" placeholder="Amount ₹" value={c.amount} onChange={(e) => updateCharge(i, { amount: Number(e.target.value) })} className="text-right" />
              </div>
              <div className="col-span-1 text-right">
                <Button type="button" size="icon" variant="ghost" onClick={() => removeCharge(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="text-sm text-muted-foreground">
              Items: {formatPaise(itemsTotal)} · Expenses: {formatPaise(chargesTotal)}
            </div>
            <div className="text-lg font-semibold">Total: {formatPaise(grandTotal)}</div>
          </div>
          <Button className="w-full" onClick={submit} disabled={submitting || lines.length === 0}>
            <Truck className="h-4 w-4" />
            {submitting ? "Saving…" : "Record purchase & add stock"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
