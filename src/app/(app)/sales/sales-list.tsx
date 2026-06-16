"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Filter } from "lucide-react";
import { formatPaise, formatDateTime } from "@/lib/format";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SaleRow {
  id: string;
  invoice_no: string;
  total_paise: number;
  payment_mode: "cash" | "upi" | "credit";
  created_at: string;
  customer_name: string;
}

const MODE_VARIANT: Record<SaleRow["payment_mode"], "default" | "secondary" | "warning"> = {
  cash: "secondary",
  upi: "default",
  credit: "warning",
};

export function SalesList({ rows }: { rows: SaleRow[] }) {
  const [mode, setMode] = useState("all");

  const filtered = useMemo(
    () => (mode === "all" ? rows : rows.filter((r) => r.payment_mode === mode)),
    [rows, mode]
  );

  const columns: Column<SaleRow>[] = [
    { header: "Invoice", cell: (r) => <span className="font-medium">{r.invoice_no}</span> },
    { header: "Customer", cell: (r) => r.customer_name },
    { header: "Date", cell: (r) => formatDateTime(r.created_at), className: "text-muted-foreground" },
    {
      header: "Payment",
      cell: (r) => (
        <Badge variant={MODE_VARIANT[r.payment_mode]} className="capitalize">
          {r.payment_mode}
        </Badge>
      ),
    },
    { header: "Total", cell: (r) => formatPaise(r.total_paise), className: "text-right font-medium" },
    {
      header: "",
      className: "text-right",
      cell: (r) => (
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/sales/${r.id}`}>
            <Eye className="h-4 w-4" /> View
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={filtered}
      rowKey={(r) => r.id}
      searchAccessor={(r) => `${r.invoice_no} ${r.customer_name}`}
      searchPlaceholder="Search invoices…"
      toolbar={
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-40">
            <Filter className="mr-1 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  );
}
