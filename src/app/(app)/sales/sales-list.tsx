"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileText, Download, Trash2, Filter, MoreHorizontal, Search } from "lucide-react";
import { formatPaise, formatDateTime } from "@/lib/format";
import { useDebounce } from "@/hooks/use-debounce";
import { SaleViewModal } from "@/components/sale-view-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function SalesList({
  rows,
  page,
  pageCount,
  total,
  q,
  mode,
  canDelete,
}: {
  rows: SaleRow[];
  page: number;
  pageCount: number;
  total: number;
  q: string;
  mode: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [viewId, setViewId] = useState<string | null>(null);
  const [search, setSearch] = useState(q);
  const debounced = useDebounce(search, 350);
  const lastPushed = useRef(q);

  // Build a URL and navigate (server refetches the page).
  function go(params: { page?: number; q?: string; mode?: string }) {
    const sp = new URLSearchParams();
    const next = { page, q, mode, ...params };
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    if (next.q) sp.set("q", next.q);
    if (next.mode && next.mode !== "all") sp.set("mode", next.mode);
    router.push(`/sales${sp.toString() ? `?${sp}` : ""}`);
  }

  // Push debounced search (reset to page 1) when it actually changes.
  useEffect(() => {
    if (debounced === lastPushed.current) return;
    lastPushed.current = debounced;
    go({ q: debounced, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  async function handleDelete(id: string, invoice: string) {
    if (!confirm(`Delete invoice ${invoice}? The sold stock will be returned to inventory.`)) return;
    const res = await deleteSaleAction(id);
    if (!res.ok) toast({ variant: "destructive", title: "Could not delete", description: res.error });
    else {
      toast({ variant: "success", title: `${invoice} deleted`, description: "Stock restored." });
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice no…"
            className="pl-8"
          />
        </div>
        <Select value={mode} onValueChange={(v) => go({ mode: v, page: 1 })}>
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
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.invoice_no}</TableCell>
                  <TableCell>{r.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant={MODE_VARIANT[r.payment_mode]} className="capitalize">
                      {r.payment_mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPaise(r.total_paise)}</TableCell>
                  <TableCell className="text-right">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} invoice{total === 1 ? "" : "s"} · page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => go({ page: page + 1 })}>
            Next
          </Button>
        </div>
      </div>

      <SaleViewModal saleId={viewId} open={!!viewId} onOpenChange={(o) => !o && setViewId(null)} />
    </div>
  );
}
