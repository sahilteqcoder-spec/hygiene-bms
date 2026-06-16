"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPaise, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SaleDetail {
  invoice_no: string;
  created_at: string;
  payment_mode: string;
  subtotal_paise: number;
  discount_paise: number;
  total_paise: number;
  customer: { name: string } | null;
  sale_items: {
    quantity: number;
    unit_price_paise: number;
    total_paise: number;
    product: { name: string } | null;
  }[];
}

export function SaleViewModal({
  saleId,
  open,
  onOpenChange,
}: {
  saleId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !saleId) return;
    let active = true;
    setLoading(true);
    setSale(null);
    const supabase = createClient();
    supabase
      .from("sales")
      .select(
        "invoice_no, created_at, payment_mode, subtotal_paise, discount_paise, total_paise, customer:customers(name), sale_items(quantity, unit_price_paise, total_paise, product:products(name))"
      )
      .eq("id", saleId)
      .single()
      .then(({ data }) => {
        if (active) {
          setSale(data as unknown as SaleDetail);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [open, saleId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sale ? `Invoice ${sale.invoice_no}` : "Sale"}
            {sale && <Badge variant="outline" className="capitalize">{sale.payment_mode}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading || !sale ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium">{sale.customer?.name ?? "Walk-in Customer"}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{formatDateTime(sale.created_at)}</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.sale_items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell>{it.product?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">{formatPaise(it.unit_price_paise)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPaise(it.total_paise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="ml-auto w-56 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPaise(sale.subtotal_paise)}</span></div>
              {sale.discount_paise > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>− {formatPaise(sale.discount_paise)}</span></div>
              )}
              <div className="flex justify-between border-t pt-1 text-base font-semibold"><span>Total</span><span>{formatPaise(sale.total_paise)}</span></div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" asChild>
                <Link href={`/sales/${saleId}`}>
                  <FileText className="h-4 w-4" /> Full invoice
                </Link>
              </Button>
              <Button asChild>
                <a href={`/api/invoices/${saleId}?store=1`} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" /> PDF
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
