import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/permissions";
import { formatPaise, formatNumber } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { Package, Boxes, AlertTriangle } from "lucide-react";
import { InventoryClient } from "./inventory-client";
import type { CurrentStock, Product } from "@/types/product";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await requireAccess("inventory");
  const supabase = await createClient();

  const [{ data: stock }, { data: products }] = await Promise.all([
    supabase.from("current_stock_view").select("*").order("name"),
    supabase.from("products").select("*").is("deleted_at", null).order("name"),
  ]);

  const rows = (stock ?? []) as CurrentStock[];
  const totalValue = rows.reduce((s, r) => s + r.stock_value_paise, 0);
  const lowCount = rows.filter((r) => r.is_low_stock).length;
  const totalUnits = rows.reduce((s, r) => s + r.current_stock, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Products" value={formatNumber(rows.length)} icon={Package} />
        <StatCard label="Units in stock" value={formatNumber(totalUnits)} icon={Boxes} accent="sky" />
        <StatCard label="Inventory value (cost)" value={formatPaise(totalValue)} icon={Boxes} accent="emerald" />
        {lowCount > 0 && (
          <StatCard label="Low / out of stock" value={formatNumber(lowCount)} icon={AlertTriangle} accent="amber" />
        )}
      </div>

      <InventoryClient
        rows={rows}
        products={(products ?? []) as Product[]}
        canDelete={isOwner(user.role)}
      />
    </div>
  );
}
