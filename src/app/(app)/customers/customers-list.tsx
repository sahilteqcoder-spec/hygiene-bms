"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { Customer } from "@/types/customer";
import { formatPaise } from "@/lib/format";
import { DataTable, type Column } from "@/components/data-table";
import { CustomerForm } from "@/components/forms/customer-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteCustomer } from "./actions";
import { useToast } from "@/hooks/use-toast";

export type CustomerRow = Customer & { outstanding_paise: number };

export function CustomersList({ rows, canDelete }: { rows: CustomerRow[]; canDelete: boolean }) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await deleteCustomer(id);
    if (!res.ok) toast({ variant: "destructive", title: "Failed", description: res.error });
    else {
      toast({ variant: "success", title: "Customer deleted" });
      router.refresh();
    }
  }

  const columns: Column<CustomerRow>[] = [
    {
      header: "Customer",
      cell: (r) => (
        <Link href={`/customers/${r.id}`} className="font-medium hover:underline">
          {r.name}
        </Link>
      ),
    },
    {
      header: "Type",
      cell: (r) => <Badge variant="outline" className="capitalize">{r.customer_type}</Badge>,
    },
    { header: "Phone", cell: (r) => r.phone ?? "—", className: "text-muted-foreground" },
    {
      header: "Outstanding",
      className: "text-right",
      cell: (r) => (
        <span className={r.outstanding_paise > 0 ? "font-medium text-amber-600" : "text-muted-foreground"}>
          {formatPaise(r.outstanding_paise)}
        </span>
      ),
    },
    {
      header: "",
      className: "text-right",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">⋯</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/customers/${r.id}`}>
                <BookOpen className="h-4 w-4" /> Ledger
              </Link>
            </DropdownMenuItem>
            <CustomerForm
              customer={r}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="h-4 w-4" /> Edit
                </DropdownMenuItem>
              }
            />
            {canDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => handleDelete(r.id, r.name)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      searchAccessor={(r) => `${r.name} ${r.phone ?? ""}`}
      searchPlaceholder="Search customers…"
      toolbar={
        <CustomerForm
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Add customer
            </Button>
          }
        />
      }
    />
  );
}
