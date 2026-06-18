import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildInvoiceVM, fetchSaleWithItems } from "@/lib/invoice";
import { upiQrDataUrl } from "@/lib/upi";
import { InvoicePreview } from "@/components/invoice-preview";
import { PrintButton } from "@/components/print-button";
import { ReturnDialog, type ReturnableItem } from "@/components/forms/return-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAccess("sales");
  const { id } = await params;
  const supabase = await createClient();

  const sale = await fetchSaleWithItems(supabase, id);
  if (!sale) notFound();

  const { data: settings } = await supabase.from("business_settings").select("*").single();
  if (!settings) notFound();

  const vm = buildInvoiceVM(sale, settings);
  const upiQr = await upiQrDataUrl(settings.upi_id, settings.business_name, sale.total_paise);

  // Already-returned quantity per product, to compute what's still returnable.
  const { data: returnedRows } = await supabase
    .from("sale_return_items")
    .select("product_id, quantity, return_id, sale_returns!inner(sale_id)")
    .eq("sale_returns.sale_id", id);

  const returnedByProduct = new Map<string, number>();
  for (const r of (returnedRows ?? []) as { product_id: string; quantity: number }[]) {
    returnedByProduct.set(r.product_id, (returnedByProduct.get(r.product_id) ?? 0) + r.quantity);
  }
  const totalReturnedQty = Array.from(returnedByProduct.values()).reduce((a, b) => a + b, 0);

  const returnableItems: ReturnableItem[] = sale.sale_items.map((si) => ({
    product_id: si.product_id,
    name: si.product.name,
    sold: si.quantity,
    returned: returnedByProduct.get(si.product_id) ?? 0,
    unit_price_paise: si.unit_price_paise,
  }));

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/sales">
            <ArrowLeft className="h-4 w-4" /> Back to sales
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <ReturnDialog saleId={sale.id} items={returnableItems} />
          <PrintButton />
          <Button asChild>
            <a href={`/api/invoices/${sale.id}?store=1`} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </Button>
        </div>
      </div>

      {totalReturnedQty > 0 && (
        <div className="no-print">
          <Badge variant="warning">{totalReturnedQty} item(s) returned on this invoice</Badge>
        </div>
      )}

      <InvoicePreview vm={vm} upiQr={upiQr} />
    </div>
  );
}
