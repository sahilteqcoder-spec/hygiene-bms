"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ShoppingCart, ScanLine, Plus } from "lucide-react";
import type { CartLine } from "@/types/sales";
import { CustomerForm } from "@/components/forms/customer-form";
import { formatPaise, paiseToRupees, rupeesToPaise } from "@/lib/format";
import { subtotalPaise, saleTotalPaise, tierPricePaise } from "@/lib/calculations";
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

interface PriceTierLite {
  min_quantity: number;
  price_paise: number;
}
interface ProductOption {
  product_id: string;
  name: string;
  unit: string;
  current_stock: number;
  selling_price_paise: number; // base price
  barcode: string | null;
  tiers: PriceTierLite[];
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
  const [barcode, setBarcode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.product_id, p])),
    [products]
  );

  const available = useMemo(
    () => products.filter((p) => p.current_stock > 0 && !cart.some((c) => c.product_id === p.product_id)),
    [products, cart]
  );

  // Effective unit price for a product at a quantity (base + tiers).
  function priceFor(productId: string, qty: number): number {
    const p = productMap.get(productId);
    if (!p) return 0;
    return tierPricePaise(p.selling_price_paise, p.tiers, qty);
  }

  function addToCart(p: ProductOption) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === p.product_id);
      if (existing) {
        const q = Math.min(existing.quantity + 1, p.current_stock);
        return prev.map((l) =>
          l.product_id === p.product_id
            ? { ...l, quantity: q, unit_price_paise: priceFor(p.product_id, q) }
            : l
        );
      }
      return [
        ...prev,
        {
          product_id: p.product_id,
          name: p.name,
          unit: p.unit,
          available: p.current_stock,
          quantity: 1,
          unit_price_paise: priceFor(p.product_id, 1),
        },
      ];
    });
  }

  function addProduct(productId: string) {
    const p = productMap.get(productId);
    if (p) addToCart(p);
    setPicker("");
  }

  // Barcode scan / manual entry → add the matching product (increment if present).
  function addByBarcode() {
    const code = barcode.trim();
    if (!code) return;
    const p = products.find((x) => (x.barcode ?? "").toLowerCase() === code.toLowerCase());
    setBarcode("");
    if (!p) {
      toast({ variant: "destructive", title: "Not found", description: `No product with barcode ${code}` });
      return;
    }
    if (p.current_stock <= 0) {
      toast({ variant: "destructive", title: "Out of stock", description: p.name });
      return;
    }
    addToCart(p);
  }

  // Changing quantity re-applies the tier price automatically.
  function changeQuantity(id: string, quantity: number) {
    setCart((prev) =>
      prev.map((l) =>
        l.product_id === id ? { ...l, quantity, unit_price_paise: priceFor(id, quantity) } : l
      )
    );
  }
  function changePrice(id: string, paise: number) {
    setCart((prev) => prev.map((l) => (l.product_id === id ? { ...l, unit_price_paise: paise } : l)));
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
            <div className="space-y-1">
              <Label>Scan / enter barcode</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addByBarcode();
                      }
                    }}
                    placeholder="Scan barcode and press Enter…"
                    className="pl-8"
                  />
                </div>
                <Button type="button" variant="outline" onClick={addByBarcode}>
                  Add
                </Button>
              </div>
            </div>

            <Label>…or pick a product</Label>
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
                      {p.tiers.length > 0 ? " · tiered" : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <div className="rounded-md border">
              {/* Column headers (desktop only) */}
              <div className="hidden grid-cols-12 gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
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
                cart.map((l) => {
                  const p = productMap.get(l.product_id);
                  const tiered = p && p.tiers.length > 0;
                  return (
                    <div key={l.product_id} className="space-y-2 border-b px-3 py-3 text-sm last:border-0 sm:space-y-0">
                      {/* Row 1 (mobile): name + remove. On desktop name sits in the grid. */}
                      <div className="flex items-start justify-between sm:hidden">
                        <div>
                          <div className="font-medium">{l.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.available} {l.unit} available{tiered ? " · auto-priced" : ""}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeLine(l.product_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-12 sm:items-center">
                        <div className="hidden sm:col-span-5 sm:block">
                          <div className="font-medium">{l.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.available} {l.unit} available{tiered ? " · price auto-set by quantity" : ""}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs text-muted-foreground sm:hidden">Qty</label>
                          <Input
                            type="number"
                            min={1}
                            max={l.available}
                            value={l.quantity}
                            onChange={(e) => changeQuantity(l.product_id, Number(e.target.value))}
                            className={l.quantity > l.available ? "border-destructive" : ""}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs text-muted-foreground sm:hidden">Price (₹)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={paiseToRupees(l.unit_price_paise)}
                            onChange={(e) => changePrice(l.product_id, rupeesToPaise(Number(e.target.value) || 0))}
                            className="text-right"
                          />
                        </div>
                        <div className="text-right sm:col-span-2">
                          <label className="mb-1 block text-xs text-muted-foreground sm:hidden">Total</label>
                          <span className="font-medium">{formatPaise(l.quantity * l.unit_price_paise)}</span>
                        </div>
                        <div className="hidden text-right sm:col-span-1 sm:block">
                          <Button size="icon" variant="ghost" onClick={() => removeLine(l.product_id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
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
              <div className="flex gap-2">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.customer_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CustomerForm
                  trigger={
                    <Button type="button" variant="outline" size="icon" aria-label="Add customer">
                      <Plus className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The selected customer&apos;s name &amp; details print on the invoice.
              </p>
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
