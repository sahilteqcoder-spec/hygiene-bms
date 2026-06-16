import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PurchasesView, type PurchaseRow } from "./purchases-view";
import type { Supplier } from "@/types/product";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const user = await requireUser();
  if (!isOwner(user.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: purchases }, { data: suppliers }] = await Promise.all([
    supabase
      .from("purchases")
      .select("id, invoice_no, total_amount_paise, transport_cost_paise, created_at, supplier:suppliers(name)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("suppliers").select("*").order("name"),
  ]);

  const rows: PurchaseRow[] = (purchases ?? []).map((p: any) => ({
    id: p.id,
    invoice_no: p.invoice_no,
    supplier_name: p.supplier?.name ?? "—",
    total_amount_paise: p.total_amount_paise,
    transport_cost_paise: p.transport_cost_paise,
    created_at: p.created_at,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Purchases</h2>
          <p className="text-sm text-muted-foreground">Stock purchases and supplier directory.</p>
        </div>
        <Button asChild>
          <Link href="/purchases/new">
            <Plus className="h-4 w-4" /> New purchase
          </Link>
        </Button>
      </div>
      <PurchasesView purchases={rows} suppliers={(suppliers ?? []) as Supplier[]} />
    </div>
  );
}
