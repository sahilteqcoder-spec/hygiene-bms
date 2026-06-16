import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/permissions";
import { CustomersList, type CustomerRow } from "./customers-list";
import type { Customer } from "@/types/customer";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await requireAccess("customers");
  const supabase = await createClient();

  const [{ data: customers }, { data: outstanding }] = await Promise.all([
    supabase.from("customers").select("*").is("deleted_at", null).order("name"),
    supabase.from("customer_outstanding_view").select("customer_id, outstanding_paise"),
  ]);

  const oMap = new Map((outstanding ?? []).map((o) => [o.customer_id, o.outstanding_paise]));
  const rows: CustomerRow[] = ((customers ?? []) as Customer[]).map((c) => ({
    ...c,
    outstanding_paise: oMap.get(c.id) ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Customers</h2>
        <p className="text-sm text-muted-foreground">{rows.length} customer(s)</p>
      </div>
      <CustomersList rows={rows} canDelete={isOwner(user.role)} />
    </div>
  );
}
