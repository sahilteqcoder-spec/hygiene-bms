import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { requireUser } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { todayISO, startOfMonthISO } from "@/lib/format";
import { ReportsView } from "./reports-view";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireUser();
  if (!isOwner(user.role)) redirect("/dashboard"); // Financial Reports = owner only

  const sp = await searchParams;
  const from = sp.from ?? startOfMonthISO();
  const to = sp.to ?? todayISO();

  const supabase = await createClient();

  const [plRes, gstRes, topRes, outRes, stockRes] = await Promise.all([
    supabase
      .from("profit_loss_view")
      .select("*")
      .gte("day", from)
      .lte("day", to)
      .order("day", { ascending: false }),
    supabase
      .from("gst_summary_view")
      .select("*")
      .gte("day", from)
      .lte("day", to),
    supabase
      .from("top_products_view")
      .select("*")
      .order("qty_sold", { ascending: false })
      .limit(20),
    supabase
      .from("customer_outstanding_view")
      .select("*")
      .gt("outstanding_paise", 0)
      .order("outstanding_paise", { ascending: false }),
    supabase.from("current_stock_view").select("*").order("stock_value_paise", { ascending: false }),
  ]);

  const pl = plRes.data ?? [];

  // Monthly business report: roll daily P&L into calendar months.
  const monthMap = new Map<string, { sales: number; cogs: number; expenses: number; profit: number }>();
  for (const r of pl) {
    const key = format(parseISO(r.day), "MMM yyyy");
    const m = monthMap.get(key) ?? { sales: 0, cogs: 0, expenses: 0, profit: 0 };
    m.sales += r.total_sales_paise;
    m.cogs += r.cogs_paise;
    m.expenses += r.expenses_paise;
    m.profit += r.net_profit_paise;
    monthMap.set(key, m);
  }
  const monthly = Array.from(monthMap.entries()).map(([month, v]) => ({ month, ...v }));

  // GST: aggregate per rate across the range.
  const gstMap = new Map<number, { taxable: number; cgst: number; sgst: number; gst: number; gross: number }>();
  for (const g of gstRes.data ?? []) {
    const m = gstMap.get(g.gst_rate) ?? { taxable: 0, cgst: 0, sgst: 0, gst: 0, gross: 0 };
    m.taxable += g.taxable_paise;
    m.cgst += g.cgst_paise;
    m.sgst += g.sgst_paise;
    m.gst += g.gst_paise;
    m.gross += g.gross_paise;
    gstMap.set(g.gst_rate, m);
  }
  const gst = Array.from(gstMap.entries()).map(([rate, v]) => ({ rate, ...v }));

  return (
    <ReportsView
      from={from}
      to={to}
      pl={pl}
      monthly={monthly}
      gst={gst}
      topProducts={topRes.data ?? []}
      outstanding={outRes.data ?? []}
      inventory={stockRes.data ?? []}
    />
  );
}
