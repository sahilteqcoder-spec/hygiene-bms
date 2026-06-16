import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SalesList, type SaleRow } from "./sales-list";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  await requireAccess("sales");
  const supabase = await createClient();

  const { data } = await supabase
    .from("sales")
    .select("id, invoice_no, total_paise, payment_mode, created_at, customer:customers(name)")
    .order("created_at", { ascending: false })
    .limit(500);

  const rows: SaleRow[] = (data ?? []).map((s: any) => ({
    id: s.id,
    invoice_no: s.invoice_no,
    total_paise: s.total_paise,
    payment_mode: s.payment_mode,
    created_at: s.created_at,
    customer_name: s.customer?.name ?? "Walk-in Customer",
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sales & Invoices</h2>
          <p className="text-sm text-muted-foreground">{rows.length} invoice(s)</p>
        </div>
        <Button asChild>
          <Link href="/sales/new">
            <Plus className="h-4 w-4" /> New sale
          </Link>
        </Button>
      </div>
      <SalesList rows={rows} />
    </div>
  );
}
