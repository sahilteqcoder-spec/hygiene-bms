import {
  IndianRupee,
  Receipt,
  TrendingUp,
  Wallet,
  PackageX,
  ShoppingCart,
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/permissions";
import { formatPaise, formatDate } from "@/lib/format";
import type { DashboardSummary } from "@/types/database";
import { StatCard } from "@/components/stat-card";
import {
  SalesTrendChart,
  RevenueBarChart,
  ExpensePieChart,
  TopProductsChart,
} from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAccess("dashboard");
  const owner = isOwner(user.role);
  const supabase = await createClient();

  const fromTrend = format(subDays(new Date(), 179), "yyyy-MM-dd");

  const [summaryRes, plRes, topRes, lowRes, recentSalesRes] = await Promise.all([
    supabase.rpc("dashboard_summary"),
    supabase
      .from("profit_loss_view")
      .select("day, total_sales_paise, net_profit_paise")
      .gte("day", fromTrend)
      .order("day", { ascending: true }),
    supabase
      .from("top_products_view")
      .select("name, qty_sold")
      .order("qty_sold", { ascending: false })
      .limit(6),
    supabase
      .from("current_stock_view")
      .select("product_id, name, current_stock, reorder_point")
      .eq("is_low_stock", true)
      .order("current_stock", { ascending: true })
      .limit(8),
    supabase
      .from("sales")
      .select("id, invoice_no, total_paise, payment_mode, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const summary = (summaryRes.data ?? {
    today_sales_paise: 0,
    today_expenses_paise: 0,
    today_cogs_paise: 0,
    today_net_profit_paise: 0,
    outstanding_paise: 0,
  }) as DashboardSummary;

  const pl = plRes.data ?? [];
  const trend = pl.slice(-14).map((r) => ({
    label: format(parseISO(r.day), "dd MMM"),
    sales_paise: r.total_sales_paise,
  }));

  // Monthly revenue (group the per-day P&L rows into calendar months).
  const monthMap = new Map<string, number>();
  for (const r of pl) {
    const key = format(parseISO(r.day), "MMM yy");
    monthMap.set(key, (monthMap.get(key) ?? 0) + r.total_sales_paise);
  }
  const monthly = Array.from(monthMap.entries()).map(([label, revenue_paise]) => ({
    label,
    revenue_paise,
  }));

  // Expense breakdown for current month (owner only).
  let expenseBreakdown: { name: string; value_paise: number }[] = [];
  if (owner) {
    const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
    const { data: exp } = await supabase
      .from("expenses")
      .select("category, amount_paise")
      .gte("date", monthStart);
    const map = new Map<string, number>();
    for (const e of exp ?? []) map.set(e.category, (map.get(e.category) ?? 0) + e.amount_paise);
    expenseBreakdown = Array.from(map.entries()).map(([name, value_paise]) => ({ name, value_paise }));
  }

  const topProducts = (topRes.data ?? []).map((p) => ({ name: p.name, qty: p.qty_sold }));
  const lowStock = lowRes.data ?? [];
  const recentSales = recentSalesRes.data ?? [];

  return (
    <div className="space-y-6">
      {/* Headline cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Sales" value={formatPaise(summary.today_sales_paise)} icon={IndianRupee} accent="emerald" />
        {owner && (
          <StatCard label="Today's Expenses" value={formatPaise(summary.today_expenses_paise)} icon={Receipt} accent="rose" />
        )}
        {owner && (
          <StatCard
            label="Net Profit (today)"
            value={formatPaise(summary.today_net_profit_paise)}
            icon={TrendingUp}
            accent={summary.today_net_profit_paise >= 0 ? "sky" : "rose"}
          />
        )}
        <StatCard label="Outstanding Payments" value={formatPaise(summary.outstanding_paise)} icon={Wallet} accent="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Daily Sales Trend (14 days)</CardTitle></CardHeader>
          <CardContent><SalesTrendChart data={trend} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
          <CardContent><RevenueBarChart data={monthly} /></CardContent>
        </Card>
        {owner && (
          <Card>
            <CardHeader><CardTitle>Expense Breakdown (this month)</CardTitle></CardHeader>
            <CardContent><ExpensePieChart data={expenseBreakdown} /></CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle>Top Selling Products</CardTitle></CardHeader>
          <CardContent><TopProductsChart data={topProducts} /></CardContent>
        </Card>
      </div>

      {/* Low stock + recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <PackageX className="h-4 w-4 text-amber-600" />
            <CardTitle>Reorder Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products above reorder level. 🎉</p>
            ) : (
              lowStock.map((p) => (
                <div key={p.product_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <Link href="/inventory" className="font-medium hover:underline">{p.name}</Link>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">reorder ≤ {p.reorder_point}</span>
                    <Badge variant={p.current_stock <= 0 ? "destructive" : "warning"}>
                      {p.current_stock} left
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              recentSales.map((s) => (
                <Link
                  key={s.id}
                  href={`/sales/${s.id}`}
                  className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
                >
                  <span className="font-medium">{s.invoice_no}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{s.payment_mode}</Badge>
                    <span>{formatPaise(s.total_paise)}</span>
                    <span className="hidden text-muted-foreground sm:inline">{formatDate(s.created_at)}</span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
