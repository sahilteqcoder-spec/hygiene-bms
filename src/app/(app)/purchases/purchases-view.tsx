"use client";

import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Supplier } from "@/types/product";
import { formatPaise, formatDate } from "@/lib/format";
import { DataTable, type Column } from "@/components/data-table";
import { SupplierForm } from "@/components/forms/supplier-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSupplier, deletePurchase } from "./actions";
import { useToast } from "@/hooks/use-toast";

export interface PurchaseRow {
  id: string;
  invoice_no: string | null;
  supplier_name: string;
  total_amount_paise: number;
  transport_cost_paise: number;
  created_at: string;
}

export function PurchasesView({
  purchases,
  suppliers,
  canDelete,
}: {
  purchases: PurchaseRow[];
  suppliers: Supplier[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function removeSupplier(id: string, name: string) {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    const res = await deleteSupplier(id);
    if (!res.ok) toast({ variant: "destructive", title: "Failed", description: res.error });
    else {
      toast({ variant: "success", title: "Supplier deleted" });
      router.refresh();
    }
  }

  async function removePurchase(id: string, invoice: string | null) {
    if (!confirm(`Delete purchase ${invoice ?? ""}? The added stock will be reversed.`)) return;
    const res = await deletePurchase(id);
    if (!res.ok) toast({ variant: "destructive", title: "Failed", description: res.error });
    else {
      toast({ variant: "success", title: "Purchase deleted", description: "Stock reversed." });
      router.refresh();
    }
  }

  const purchaseCols: Column<PurchaseRow>[] = [
    { header: "Invoice", cell: (r) => <span className="font-medium">{r.invoice_no ?? "—"}</span> },
    { header: "Supplier", cell: (r) => r.supplier_name },
    { header: "Date", cell: (r) => formatDate(r.created_at), className: "text-muted-foreground" },
    { header: "Charges", cell: (r) => formatPaise(r.transport_cost_paise), className: "text-right text-muted-foreground" },
    { header: "Total", cell: (r) => formatPaise(r.total_amount_paise), className: "text-right font-medium" },
    ...(canDelete
      ? [
          {
            header: "",
            className: "text-right",
            cell: (r: PurchaseRow) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">⋯</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => removePurchase(r.id, r.invoice_no)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete purchase
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } as Column<PurchaseRow>,
        ]
      : []),
  ];

  const supplierCols: Column<Supplier>[] = [
    { header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
    { header: "Phone", cell: (r) => r.phone ?? "—", className: "text-muted-foreground" },
    { header: "GSTIN", cell: (r) => r.gstin ?? "—", className: "text-muted-foreground" },
    {
      header: "",
      className: "text-right",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">⋯</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <SupplierForm
              supplier={r}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="h-4 w-4" /> Edit
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => removeSupplier(r.id, r.name)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <Tabs defaultValue="purchases">
      <TabsList>
        <TabsTrigger value="purchases">Purchase History</TabsTrigger>
        <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
      </TabsList>
      <TabsContent value="purchases" className="mt-4">
        <DataTable
          columns={purchaseCols}
          data={purchases}
          rowKey={(r) => r.id}
          searchAccessor={(r) => `${r.invoice_no ?? ""} ${r.supplier_name}`}
          searchPlaceholder="Search purchases…"
        />
      </TabsContent>
      <TabsContent value="suppliers" className="mt-4">
        <DataTable
          columns={supplierCols}
          data={suppliers}
          rowKey={(r) => r.id}
          searchAccessor={(r) => `${r.name} ${r.phone ?? ""}`}
          searchPlaceholder="Search suppliers…"
          toolbar={
            <SupplierForm
              trigger={
                <Button>
                  <Plus className="h-4 w-4" /> Add supplier
                </Button>
              }
            />
          }
        />
      </TabsContent>
    </Tabs>
  );
}
