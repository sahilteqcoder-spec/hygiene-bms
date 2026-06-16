"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileText, Download, Trash2, Filter, MoreHorizontal } from "lucide-react";
import { formatPaise, formatDateTime } from "@/lib/format";
import { DataTable, type Column } from "@/components/data-table";
import { SaleViewModal } from "@/components/sale-view-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteSaleAction } from "./actions";

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

export function SalesList({ rows, canDelete }: { rows: SaleRow[]; canDelete: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (mode === "all" ? rows : rows.filter((r) => r.payment_mode === mode)),
    [rows, mode]
  );

  async function handleDelete(id: string, invoice: string) {
    if (!confirm(`Delete invoice ${invoice}? The sold stock will be returned to inventory.`)) return;
    const res = await deleteSaleAction(id);
    if (!res.ok) toast({ variant: "destructive", title: "Could not delete", description: res.error });
    else {
      toast({ variant: "success", title: `${invoice} deleted`, description: "Stock restored." });
      router.refresh();
    }
  }

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
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" onClick={() => setViewId(r.id)}>
            <Eye className="h-4 w-4" /> View
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/sales/${r.id}`}>
                  <FileText className="h-4 w-4" /> Full invoice
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/invoices/${r.id}?store=1`} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" /> Download PDF
                </a>
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => handleDelete(r.id, r.invoice_no)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
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
      <SaleViewModal saleId={viewId} open={!!viewId} onOpenChange={(o) => !o && setViewId(null)} />
    </>
  );
}
