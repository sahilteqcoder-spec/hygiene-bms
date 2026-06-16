"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import type { CartLine } from "@/types/sales";
import { formatPaise, paiseToRupees, rupeesToPaise } from "@/lib/format";
import { subtotalPaise, saleTotalPaise } from "@/lib/calculations";
import { createSaleAction } from "@/app/(app)/sales/actions";
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
  product_id: string;
  name: string;
  unit: string;
  current_stock: number;
  selling_price_paise: number;
  wholesale_price_paise: number;
}
interface CustomerOption {
  id: string;
  name: string;
  customer_type: "retail" | "wholesale";
}

export function SaleForm({
  products,
  customers,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "credit">("cash");
  const [discountRupees, setDiscountRupees] = useState<string>("0");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picker, setPicker] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  const isWholesale = customer?.customer_type === "wholesale";

  const available = useMemo(
    () => products.filter((p) => p.current_stock > 0 && !cart.some((c) => c.product_id === p.product_id)),
    [products, cart]
  );

  function addProduct(productId: string) {
    const p = products.find((x) => x.product_id === productId);
    if (!p) return;
    setCart((prev) => [
      ...prev,
      {
        product_id: p.product_id,
        name: p.name,
        unit: p.unit,
        available: p.current_stock,
        quantity: 1,
        unit_price_paise: isWholesale ? p.wholesale_price_paise : p.selling_price_paise,
      },
    ]);
    setPicker("");
  }

  function updateLine(id: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.product_id === id ? { ...l, ...patch } : l)));
  }
  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.product_id !== id));
  }

  const discountPaise = rupeesToPaise(Number(discountRupees) || 0);
  const subtotal = subtotalPaise(cart);
  const total = saleTotalPaise(cart, discountPaise);
  const overStock = cart.some((l) => l.quantity > l.available || l.quantity < 1);

  async function submit() {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: "Add at least one product" });
      return;
    }
    if (overStock) {
      toast({ variant: "destructive", title: "Check quantities", description: "A line exceeds available stock." });
      return;
    }
    setSubmitting(true);
    const res = await createSaleAction({
      customer_id: customerId === "walk-in" ? null : customerId,
      payment_mode: paymentMode,
      discount: Number(discountRupees) || 0,
      items: cart.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        unit_price_paise: l.unit_price_paise,
      })),
    });
    setSubmitting(false);

    if (!res.ok) {
      toast({ variant: "destructive", title: "Sale failed", description: res.error });
      return;
    }
    toast({ variant: "success", title: `Invoice ${res.invoiceNo} created` });
    router.push(`/sales/${res.saleId}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Cart */}
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardContent className="space-y-3 p-4">
            <Label>Add product</Label>
            <Select value={picker} onValueChange={addProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product to add to the bill…" />
              </SelectTrigger>
              <SelectContent>
                {available.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">No products available</div>
                ) : (
                  available.map((p) => (
                    <SelectItem key={p.product_id} value={p.product_id}>
                      {p.name} — {p.current_stock} {p.unit} in stock
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                <div className="col-span-5">Product</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Price (₹)</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1" />
              </div>
              {cart.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No items yet. Add products above.
                </p>
              ) : (
                cart.map((l) => (
                  <div key={l.product_id} className="grid grid-cols-12 items-center gap-2 border-b px-3 py-2 text-sm last:border-0">
                    <div className="col-span-5">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.available} {l.unit} available</div>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min={1}
                        max={l.available}
                        value={l.quantity}
                        onChange={(e) => updateLine(l.product_id, { quantity: Number(e.target.value) })}
                        className={l.quantity > l.available ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={paiseToRupees(l.unit_price_paise)}
                        onChange={(e) => updateLine(l.product_id, { unit_price_paise: rupeesToPaise(Number(e.target.value) || 0) })}
                        className="text-right"
                      />
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      {formatPaise(l.quantity * l.unit_price_paise)}
                    </div>
                    <div className="col-span-1 text-right">
                      <Button size="icon" variant="ghost" onClick={() => removeLine(l.product_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <div>
        <Card className="sticky top-2">
          <CardContent className="space-y-4 p-4">
            <div className="space-y-1">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in (retail)</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.customer_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isWholesale && <p className="text-xs text-muted-foreground">Wholesale pricing applied to new lines.</p>}
            </div>

            <div className="space-y-1">
              <Label>Payment mode</Label>
              <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as typeof paymentMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="credit">Credit (on account)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Discount (₹)</Label>
              <Input type="number" step="0.01" value={discountRupees} onChange={(e) => setDiscountRupees(e.target.value)} />
            </div>

            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPaise(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>− {formatPaise(discountPaise)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatPaise(total)}</span></div>
            </div>

            <Button className="w-full" onClick={submit} disabled={submitting || cart.length === 0}>
              <ShoppingCart className="h-4 w-4" />
              {submitting ? "Processing…" : "Complete sale"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
