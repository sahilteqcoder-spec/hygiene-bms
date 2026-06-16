import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { formatPaise, startOfMonthISO } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { ExpensesList } from "./expenses-list";
import type { Expense } from "@/types/sales";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const user = await requireUser();
  if (!isOwner(user.role)) redirect("/dashboard"); // owner-only module

  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as Expense[];
  const monthStart = startOfMonthISO();
  const monthTotal = rows
    .filter((e) => e.date >= monthStart)
    .reduce((s, e) => s + e.amount_paise, 0);

  // Category totals (this month).
  const byCat = new Map<string, number>();
  for (const e of rows.filter((e) => e.date >= monthStart))
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount_paise);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="This month" value={formatPaise(monthTotal)} icon={Receipt} accent="rose" />
        {Array.from(byCat.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat, amt]) => (
            <StatCard key={cat} label={cat[0].toUpperCase() + cat.slice(1)} value={formatPaise(amt)} icon={Receipt} />
          ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold">Expenses</h2>
        <p className="text-sm text-muted-foreground">Daily expense entry, tracked by category.</p>
      </div>
      <ExpensesList rows={rows} />
    </div>
  );
}
