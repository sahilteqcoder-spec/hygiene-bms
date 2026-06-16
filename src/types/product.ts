import type { Database } from "./database";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type StockEntry = Database["public"]["Tables"]["stock_entries"]["Row"];
export type StockEntryInsert =
  Database["public"]["Tables"]["stock_entries"]["Insert"];

export type CurrentStock =
  Database["public"]["Views"]["current_stock_view"]["Row"];

export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type Purchase = Database["public"]["Tables"]["purchases"]["Row"];
export type PurchaseItem =
  Database["public"]["Tables"]["purchase_items"]["Row"];
