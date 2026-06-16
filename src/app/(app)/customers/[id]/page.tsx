import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPaise, formatDateTime } from "@/lib/format";
import type { LedgerEntry } from "@/types/customer";
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

  const [{ data: sales }, { data: payments }, { data: outstanding }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, invoice_no, total_paise, created_at, payment_mode")
      .eq("customer_id", id)
      .eq("payment_mode", "credit")
      .order("created_at"),
    supabase
      .from("customer_payments")
      .select("id, amount_paise, note, created_at")
      .eq("customer_id", id)
      .order("created_at"),
    supabase
      .from("customer_outstanding_view")
      .select("credit_sales_paise, payments_paise, outstanding_paise")
      .eq("customer_id", id)
      .single(),
  ]);

  // Build a chronologically-sorted ledger with running balance.
  const entries: LedgerEntry[] = [
    ...(sales ?? []).map((s) => ({
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

  return (
    <div className="space-y-4">
      <Button variant="ghost" asChild>
        <Link href="/customers">
          <ArrowLeft className="h-4 w-4" /> Back to customers
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            {customer.name}
            <Badge variant="outline" className="capitalize">{customer.customer_type}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            {customer.phone ?? "No phone"} · {customer.address ?? "No address"}
          </p>
        </div>
        <PaymentDialog customerId={id} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Credit Sales</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold">{formatPaise(outstanding?.credit_sales_paise ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Payments</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold">{formatPaise(outstanding?.payments_paise ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold text-amber-600">{formatPaise(outstanding?.outstanding_paise ?? 0)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Ledger</CardTitle></CardHeader>
        <CardContent>
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
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    No credit transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((e) => {
                  running += e.debit_paise - e.credit_paise;
                  return (
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
                      <TableCell className="text-right font-medium">{formatPaise(running)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
