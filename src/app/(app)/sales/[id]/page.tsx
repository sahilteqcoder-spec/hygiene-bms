import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildInvoiceVM, fetchSaleWithItems } from "@/lib/invoice";
import { InvoicePreview } from "@/components/invoice-preview";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/sales">
            <ArrowLeft className="h-4 w-4" /> Back to sales
          </Link>
        </Button>
        <div className="flex gap-2">
          <PrintButton />
          <Button asChild>
            <a href={`/api/invoices/${sale.id}?store=1`} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </Button>
        </div>
      </div>

      <InvoicePreview vm={vm} />
    </div>
  );
}
