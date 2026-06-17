import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPaise, formatDateTime, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentDialog } from "@/components/forms/payment-dialog";

export const dynamic = "force-dynamic";

const MODE_VARIANT: Record<string, "default" | "secondary" | "warning"> = {
  cash: "secondary",
  upi: "default",
  credit: "warning",
};

interface LedgerRow {
  id: string;
  date: string;
  kind: "sale" | "payment";
  reference: string;
  debit_paise: number;
  credit_paise: number;
  balance_paise: number;
}

export default async function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAccess("customers");
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!customer) notFound();

  const [{ data: creditSales }, { data: payments }, { data: allSales }, { data: outstanding }] =
    await Promise.all([
      supabase
        .from("sales")
        .select("id, invoice_no, total_paise, created_at")
        .eq("customer_id", id)
        .eq("payment_mode", "credit")
        .order("created_at"),
      supabase
        .from("customer_payments")
        .select("id, amount_paise, note, created_at")
        .eq("customer_id", id)
        .order("created_at"),
      // ALL purchases by this customer, any payment mode.
      supabase
        .from("sales")
        .select("id, invoice_no, total_paise, payment_mode, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("customer_outstanding_view")
        .select("credit_sales_paise, payments_paise, outstanding_paise")
        .eq("customer_id", id)
        .single(),
    ]);

  // Ledger: credit sales (debit) + payments (credit), chronological, running balance.
  const merged = [
    ...(creditSales ?? []).map((s) => ({
      id: s.id,
      date: s.created_at,
      kind: "sale" as const,
      reference: s.invoice_no,
      debit_paise: s.total_paise,
      credit_paise: 0,
    })),
    ...(payments ?? []).map((p) => ({
      id: p.id,
      date: p.created_at,
      kind: "payment" as const,
      reference: p.note ?? "Payment",
      debit_paise: 0,
      credit_paise: p.amount_paise,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  let running = 0;
  const ledger: LedgerRow[] = merged.map((e) => {
    running += e.debit_paise - e.credit_paise;
    return { ...e, balance_paise: running };
  });

  const purchases = allSales ?? [];
  const totalBought = purchases.reduce((s, p) => s + p.total_paise, 0);

  return (
    <div className="space-y-4">
      <Button variant="ghost" asChild size="sm">
        <Link href="/customers">
          <ArrowLeft className="h-4 w-4" /> Back to customers
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold sm:text-xl">
            {customer.name}
            <Badge variant="outline" className="capitalize">{customer.customer_type}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            {customer.phone ?? "No phone"} · {customer.address ?? "No address"}
          </p>
        </div>
        <PaymentDialog customerId={id} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total bought" value={formatPaise(totalBought)} />
        <Kpi label="Credit sales" value={formatPaise(outstanding?.credit_sales_paise ?? 0)} />
        <Kpi label="Payments" value={formatPaise(outstanding?.payments_paise ?? 0)} />
        <Kpi label="Outstanding" value={formatPaise(outstanding?.outstanding_paise ?? 0)} accent />
      </div>

      {/* Purchase history (all payment modes) */}
      <Card>
        <CardHeader><CardTitle>Purchase history</CardTitle></CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.invoice_no}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(p.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={MODE_VARIANT[p.payment_mode]} className="capitalize">{p.payment_mode}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPaise(p.total_paise)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" asChild><Link href={`/sales/${p.id}`}>View</Link></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {purchases.map((p) => (
                  <Link
                    key={p.id}
                    href={`/sales/${p.id}`}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="font-medium">{p.invoice_no}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(p.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={MODE_VARIANT[p.payment_mode]} className="capitalize">{p.payment_mode}</Badge>
                      <span className="font-medium">{formatPaise(p.total_paise)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Credit ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Credit ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No credit transactions. Cash/UPI sales appear in Purchase history above.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Particulars</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.map((e) => (
                      <TableRow key={`${e.kind}-${e.id}`}>
                        <TableCell className="text-muted-foreground">{formatDateTime(e.date)}</TableCell>
                        <TableCell>
                          {e.kind === "sale" ? (
                            <Link href={`/sales/${e.id}`} className="hover:underline">Invoice {e.reference}</Link>
                          ) : (
                            <span>{e.reference}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{e.debit_paise ? formatPaise(e.debit_paise) : "—"}</TableCell>
                        <TableCell className="text-right text-emerald-600">{e.credit_paise ? formatPaise(e.credit_paise) : "—"}</TableCell>
                        <TableCell className="text-right font-medium">{formatPaise(e.balance_paise)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {ledger.map((e) => (
                  <div key={`${e.kind}-${e.id}`} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {e.kind === "sale" ? (
                          <Link href={`/sales/${e.id}`} className="hover:underline">Invoice {e.reference}</Link>
                        ) : (
                          e.reference
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className={e.debit_paise ? "text-foreground" : "text-emerald-600"}>
                        {e.debit_paise ? `Debit ${formatPaise(e.debit_paise)}` : `Credit ${formatPaise(e.credit_paise)}`}
                      </span>
                      <span className="font-medium">Bal {formatPaise(e.balance_paise)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${accent ? "text-amber-600" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
