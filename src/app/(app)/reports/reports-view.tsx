"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Download } from "lucide-react";
import { formatPaise, formatDate, formatNumber } from "@/lib/format";
import { exportCsv, rs } from "@/lib/csv";
import type { ProfitLossRow, GstSummaryRow, TopProduct } from "@/types/sales";
import type { CustomerOutstanding } from "@/types/customer";
import type { CurrentStock } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MonthlyRow {
  month: string;
  sales: number;
  cogs: number;
  expenses: number;
  profit: number;
}
interface GstRow {
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  gst: number;
  gross: number;
}

export function ReportsView({
  from,
  to,
  pl,
  monthly,
  gst,
  topProducts,
  outstanding,
  inventory,
}: {
  from: string;
  to: string;
  pl: ProfitLossRow[];
  monthly: MonthlyRow[];
  gst: GstRow[];
  topProducts: TopProduct[];
  outstanding: CustomerOutstanding[];
  inventory: CurrentStock[];
}) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function apply() {
    router.push(`/reports?from=${f}&to=${t}`);
  }

  const plTotals = pl.reduce(
    (acc, r) => ({
      sales: acc.sales + r.total_sales_paise,
      cogs: acc.cogs + r.cogs_paise,
      expenses: acc.expenses + r.expenses_paise,
      profit: acc.profit + r.net_profit_paise,
    }),
    { sales: 0, cogs: 0, expenses: 0, profit: 0 }
  );
  const invTotal = inventory.reduce((s, r) => s + r.stock_value_paise, 0);

  return (
    <div className="space-y-4">
      {/* Date range filter */}
      <Card className="no-print">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <CalendarRange className="mb-2 h-5 w-5 text-muted-foreground" />
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={f} onChange={(e) => setF(e.target.value)} className="w-44" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={t} onChange={(e) => setT(e.target.value)} className="w-44" />
          </div>
          <Button onClick={apply}>Apply</Button>
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="pl">
        <TabsList className="no-print flex-wrap">
          <TabsTrigger value="pl">Daily P&amp;L</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="gst">GST Summary</TabsTrigger>
          <TabsTrigger value="top">Top Products</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Value</TabsTrigger>
        </TabsList>

        {/* 1. Daily P&L */}
        <TabsContent value="pl" className="mt-4">
          <ReportCard
            title={`Daily Profit & Loss · ${formatDate(from)} – ${formatDate(to)}`}
            onExport={() =>
              exportCsv(
                `profit-loss_${from}_${to}`,
                ["Day", "Sales", "COGS", "Expenses", "Net Profit"],
                pl.map((r) => [r.day, rs(r.total_sales_paise), rs(r.cogs_paise), rs(r.expenses_paise), rs(r.net_profit_paise)])
              )
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pl.map((r) => (
                  <TableRow key={r.day}>
                    <TableCell>{formatDate(r.day)}</TableCell>
                    <TableCell className="text-right">{formatPaise(r.total_sales_paise)}</TableCell>
                    <TableCell className="text-right">{formatPaise(r.cogs_paise)}</TableCell>
                    <TableCell className="text-right">{formatPaise(r.expenses_paise)}</TableCell>
                    <TableCell className={`text-right font-medium ${r.net_profit_paise < 0 ? "text-destructive" : ""}`}>
                      {formatPaise(r.net_profit_paise)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{formatPaise(plTotals.sales)}</TableCell>
                  <TableCell className="text-right">{formatPaise(plTotals.cogs)}</TableCell>
                  <TableCell className="text-right">{formatPaise(plTotals.expenses)}</TableCell>
                  <TableCell className="text-right">{formatPaise(plTotals.profit)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </ReportCard>
        </TabsContent>

        {/* 2. Monthly */}
        <TabsContent value="monthly" className="mt-4">
          <ReportCard
            title="Monthly Business Report"
            onExport={() =>
              exportCsv(
                "monthly-report",
                ["Month", "Sales", "COGS", "Expenses", "Net Profit"],
                monthly.map((m) => [m.month, rs(m.sales), rs(m.cogs), rs(m.expenses), rs(m.profit)])
              )
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell>{m.month}</TableCell>
                    <TableCell className="text-right">{formatPaise(m.sales)}</TableCell>
                    <TableCell className="text-right">{formatPaise(m.cogs)}</TableCell>
                    <TableCell className="text-right">{formatPaise(m.expenses)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPaise(m.profit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ReportCard>
        </TabsContent>

        {/* 3. GST */}
        <TabsContent value="gst" className="mt-4">
          <ReportCard
            title="GST Summary"
            onExport={() =>
              exportCsv(
                `gst-summary_${from}_${to}`,
                ["GST Rate %", "Gross", "Taxable", "CGST", "SGST", "Total GST"],
                gst.map((g) => [g.rate, rs(g.gross), rs(g.taxable), rs(g.cgst), rs(g.sgst), rs(g.gst)])
              )
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GST Rate</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">Total GST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gst.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">No taxable sales in range.</TableCell></TableRow>
                ) : (
                  gst.map((g) => (
                    <TableRow key={g.rate}>
                      <TableCell>{g.rate}%</TableCell>
                      <TableCell className="text-right">{formatPaise(g.gross)}</TableCell>
                      <TableCell className="text-right">{formatPaise(g.taxable)}</TableCell>
                      <TableCell className="text-right">{formatPaise(g.cgst)}</TableCell>
                      <TableCell className="text-right">{formatPaise(g.sgst)}</TableCell>
                      <TableCell className="text-right font-medium">{formatPaise(g.gst)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ReportCard>
        </TabsContent>

        {/* 4. Top products */}
        <TabsContent value="top" className="mt-4">
          <ReportCard
            title="Top Selling Products (all-time)"
            onExport={() =>
              exportCsv(
                "top-products",
                ["Product", "Units", "Revenue", "Profit"],
                topProducts.map((p) => [p.name, p.qty_sold, rs(p.revenue_paise), rs(p.profit_paise)])
              )
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p) => (
                  <TableRow key={p.product_id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right">{formatNumber(p.qty_sold)}</TableCell>
                    <TableCell className="text-right">{formatPaise(p.revenue_paise)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPaise(p.profit_paise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ReportCard>
        </TabsContent>

        {/* 5. Outstanding */}
        <TabsContent value="outstanding" className="mt-4">
          <ReportCard
            title="Customer Outstanding Report"
            onExport={() =>
              exportCsv(
                "customer-outstanding",
                ["Customer", "Credit Sales", "Payments", "Outstanding"],
                outstanding.map((c) => [c.name, rs(c.credit_sales_paise), rs(c.payments_paise), rs(c.outstanding_paise)])
              )
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Credit Sales</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstanding.map((c) => (
                  <TableRow key={c.customer_id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right">{formatPaise(c.credit_sales_paise)}</TableCell>
                    <TableCell className="text-right">{formatPaise(c.payments_paise)}</TableCell>
                    <TableCell className="text-right font-medium text-amber-600">{formatPaise(c.outstanding_paise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ReportCard>
        </TabsContent>

        {/* 6. Inventory valuation */}
        <TabsContent value="inventory" className="mt-4">
          <ReportCard
            title={`Inventory Valuation · ${formatPaise(invTotal)} at cost`}
            onExport={() =>
              exportCsv(
                "inventory-valuation",
                ["Product", "Stock", "Unit", "Cost", "Value"],
                inventory.map((r) => [r.name, r.current_stock, r.unit, rs(r.cost_price_paise), rs(r.stock_value_paise)])
              )
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((r) => (
                  <TableRow key={r.product_id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right">{formatNumber(r.current_stock)} {r.unit}</TableCell>
                    <TableCell className="text-right">{formatPaise(r.cost_price_paise)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPaise(r.stock_value_paise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total inventory value</TableCell>
                  <TableCell className="text-right">{formatPaise(invTotal)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </ReportCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportCard({
  title,
  onExport,
  children,
}: {
  title: string;
  onExport?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="print-area">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        {onExport && (
          <Button size="sm" variant="outline" className="no-print" onClick={onExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
