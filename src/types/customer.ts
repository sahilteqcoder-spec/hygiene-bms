import type { Database } from "./database";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerInsert =
  Database["public"]["Tables"]["customers"]["Insert"];

export type CustomerPayment =
  Database["public"]["Tables"]["customer_payments"]["Row"];

export type CustomerOutstanding =
  Database["public"]["Views"]["customer_outstanding_view"]["Row"];

// A ledger row is either a credit sale (debit) or a payment (credit).
export interface LedgerEntry {
  id: string;
  date: string;
  kind: "sale" | "payment";
  reference: string;
  debit_paise: number;
  credit_paise: number;
}
