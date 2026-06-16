"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, ArrowDownToLine, ArrowUpFromLine, Trash2, Filter } from "lucide-react";
import type { CurrentStock, Product } from "@/types/product";
import { formatPaise, formatNumber } from "@/lib/format";
import { grossMarginPct } from "@/lib/calculations";
import { useInventoryRealtime } from "@/hooks/use-inventory";
import { DataTable, type Column } from "@/components/data-table";
import { ProductForm } from "@/components/forms/product-form";
import { StockDialog } from "@/components/forms/stock-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteProduct } from "./actions";
import { useToast } from "@/hooks/use-toast";

interface Props {
  rows: CurrentStock[];
  products: Product[];
  canDelete: boolean;
}

export function InventoryClient({ rows, products, canDelete }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  useInventoryRealtime(() => router.refresh());

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stockDialog, setStockDialog] = useState<{ id: string; name: string; type: "in" | "out" } | null>(null);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const types = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((r) => r.type).filter(Boolean) as string[]))],
    [rows]
  );

  const filtered = useMemo(
    () => (typeFilter === "all" ? rows : rows.filter((r) => r.type === typeFilter)),
    [rows, typeFilter]
  );

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? It will be hidden but kept for history.`)) return;
    const res = await deleteProduct(id);
    if (!res.ok) toast({ variant: "destructive", title: "Failed", description: res.error });
    else {
      toast({ variant: "success", title: "Product deleted" });
      router.refresh();
    }
  }

  const columns: Column<CurrentStock>[] = [
    {
      header: "Product",
      cell: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-muted-foreground">
            {[r.brand, r.size, r.type].filter(Boolean).join(" · ")}
          </div>
        </div>
      ),
    },
    {
      header: "Stock",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatNumber(r.current_stock)}</span>
          <span className="text-xs text-muted-foreground">{r.unit}</span>
          {r.is_low_stock && (
            <Badge variant={r.current_stock <= 0 ? "destructive" : "warning"}>
              {r.current_stock <= 0 ? "Out" : "Low"}
            </Badge>
          )}
        </div>
      ),
    },
    { header: "Reorder", cell: (r) => formatNumber(r.reorder_point), className: "text-muted-foreground" },
    { header: "Cost", cell: (r) => formatPaise(r.cost_price_paise) },
    { header: "Selling", cell: (r) => formatPaise(r.selling_price_paise) },
    {
      header: "Margin",
      cell: (r) => `${grossMarginPct(r.selling_price_paise, r.cost_price_paise).toFixed(1)}%`,
    },
    {
      header: "",
      className: "text-right",
      cell: (r) => {
        const product = productById.get(r.product_id);
        return (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStockDialog({ id: r.product_id, name: r.name, type: "in" })}
            >
              <ArrowDownToLine className="h-4 w-4" /> In
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStockDialog({ id: r.product_id, name: r.name, type: "out" })}
            >
              <ArrowUpFromLine className="h-4 w-4" /> Out
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">⋯</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {product && (
                  <ProductForm
                    product={product}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Pencil className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                    }
                  />
                )}
                {canDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => handleDelete(r.product_id, r.name)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.product_id}
        searchAccessor={(r) => `${r.name} ${r.brand ?? ""} ${r.type ?? ""}`}
        searchPlaceholder="Search products…"
        toolbar={
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <Filter className="mr-1 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "all" ? "All types" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ProductForm
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> Add product
                </Button>
              }
            />
          </div>
        }
      />

      {stockDialog && (
        <StockDialog
          productId={stockDialog.id}
          productName={stockDialog.name}
          type={stockDialog.type}
          open={!!stockDialog}
          onOpenChange={(o) => !o && setStockDialog(null)}
        />
      )}
    </>
  );
}
