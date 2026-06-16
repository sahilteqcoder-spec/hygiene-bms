import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SalesList, type SaleRow } from "./sales-list";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; mode?: string }>;
}) {
  const user = await requireAccess("sales");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim();
  const mode = sp.mode ?? "all";

  const supabase = await createClient();

  // Server-side: only fetch the current page, filtered + counted in the DB.
  let query = supabase
    .from("sales")
    .select("id, invoice_no, total_paise, payment_mode, created_at, customer:customers(name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (mode !== "all") query = query.eq("payment_mode", mode as "cash" | "upi" | "credit");
  if (q) query = query.ilike("invoice_no", `%${q}%`);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

  const rows: SaleRow[] = (data ?? []).map((s: any) => ({
    id: s.id,
    invoice_no: s.invoice_no,
    total_paise: s.total_paise,
    payment_mode: s.payment_mode,
    created_at: s.created_at,
    customer_name: s.customer?.name ?? "Walk-in Customer",
  }));

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sales &amp; Invoices</h2>
          <p className="text-sm text-muted-foreground">{total} invoice(s)</p>
        </div>
        <Button asChild>
          <Link href="/sales/new">
            <Plus className="h-4 w-4" /> New sale
          </Link>
        </Button>
      </div>
      <SalesList
        rows={rows}
        page={page}
        pageCount={pageCount}
        total={total}
        q={q}
        mode={mode}
        canDelete={isOwner(user.role)}
      />
    </div>
  );
}
