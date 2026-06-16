import type { Database } from "./database";

export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type SaleItem = Database["public"]["Tables"]["sale_items"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];

export type TopProduct = Database["public"]["Views"]["top_products_view"]["Row"];
export type ProfitLossRow =
  Database["public"]["Views"]["profit_loss_view"]["Row"];
export type GstSummaryRow =
  Database["public"]["Views"]["gst_summary_view"]["Row"];

// Sale joined with its items, customer and the cashier — used in detail/PDF views.
export interface SaleWithItems extends Sale {
  customer: { id: string; name: string; phone: string | null; address: string | null } | null;
  user: { id: string; name: string } | null;
  sale_items: (SaleItem & { product: { name: string; hsn_code: string | null; gst_rate: number } })[];
}

// One line in the in-progress cart while building a sale.
export interface CartLine {
  product_id: string;
  name: string;
  unit: string;
  available: number;
  quantity: number;
  unit_price_paise: number;
}
