"use client";

import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Expense } from "@/types/sales";
import { formatPaise, formatDate } from "@/lib/format";
import { DataTable, type Column } from "@/components/data-table";
import { ExpenseForm } from "@/components/forms/expense-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteExpense } from "./actions";
import { useToast } from "@/hooks/use-toast";

export function ExpensesList({ rows }: { rows: Expense[] }) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await deleteExpense(id);
    if (!res.ok) toast({ variant: "destructive", title: "Failed", description: res.error });
    else {
      toast({ variant: "success", title: "Expense deleted" });
      router.refresh();
    }
  }

  const columns: Column<Expense>[] = [
    { header: "Date", cell: (r) => formatDate(r.date) },
    {
      header: "Category",
      cell: (r) => <Badge variant="outline" className="capitalize">{r.category}</Badge>,
    },
    { header: "Note", cell: (r) => r.note ?? "—", className: "text-muted-foreground" },
    { header: "Amount", cell: (r) => formatPaise(r.amount_paise), className: "text-right font-medium" },
    {
      header: "",
      className: "text-right",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">⋯</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ExpenseForm
              expense={r}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="h-4 w-4" /> Edit
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => handleDelete(r.id)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
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
      searchAccessor={(r) => `${r.category} ${r.note ?? ""}`}
      searchPlaceholder="Search expenses…"
      toolbar={
        <ExpenseForm
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          }
        />
      }
    />
  );
}
