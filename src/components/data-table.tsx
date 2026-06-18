"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  // Returns a searchable string for a row; enables the search box when provided.
  searchAccessor?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  // Optional rich empty state (icon/CTA) shown when there are no rows at all.
  emptyState?: ReactNode;
  toolbar?: ReactNode;
  rowKey: (row: T) => string;
}

// Lightweight client-side table with debounced search + pagination. For large
// datasets, paginate server-side instead (see reports/sales history queries).
export function DataTable<T>({
  columns,
  data,
  searchAccessor,
  searchPlaceholder = "Search…",
  pageSize = 10,
  emptyMessage = "Nothing here yet.",
  emptyState,
  toolbar,
  rowKey,
}: DataTableProps<T>) {
  const empty = (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
      <Inbox className="h-8 w-8 opacity-40" />
      {emptyState ?? <p className="text-sm">{emptyMessage}</p>}
    </div>
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const debounced = useDebounce(query, 250);

  const filtered = useMemo(() => {
    if (!searchAccessor || !debounced.trim()) return data;
    const q = debounced.toLowerCase();
    return data.filter((row) => searchAccessor(row).toLowerCase().includes(q));
  }, [data, debounced, searchAccessor]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="space-y-3">
      {(searchAccessor || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {searchAccessor ? (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbar}
        </div>
      )}

      {/* Desktop: table */}
      <div className="hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>{empty}</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((col, i) => (
                    <TableCell key={i} className={cn(col.className)}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards (label + value per column) */}
      <div className="space-y-2 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-lg border bg-card">{empty}</div>
        ) : (
          rows.map((row) => (
            <div key={rowKey(row)} className="rounded-lg border bg-card p-3">
              {columns.map((col, i) =>
                col.header ? (
                  <div key={i} className="flex items-start justify-between gap-3 py-0.5 text-sm">
                    <span className="shrink-0 text-xs text-muted-foreground">{col.header}</span>
                    <span className="text-right">{col.cell(row)}</span>
                  </div>
                ) : (
                  <div key={i} className="mt-2 flex justify-end border-t pt-2">
                    {col.cell(row)}
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtered.length} record{filtered.length === 1 ? "" : "s"} · page {safePage + 1} of{" "}
            {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
