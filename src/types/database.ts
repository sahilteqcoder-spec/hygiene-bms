// Hand-authored Supabase schema types. After running migrations you can
// regenerate this file with:
//   supabase gen types typescript --local > src/types/database.ts
// The shape below matches supabase/migrations exactly. Note the `Relationships`
// and `CompositeTypes` keys: supabase-js v2 requires them or every query result
// degrades to `never`.

export type UserRole = "owner" | "staff";
export type StockMovement = "in" | "out";
export type CustomerType = "retail" | "wholesale";
export type PaymentMode = "cash" | "upi" | "credit";
export type ExpenseCategory =
  | "rent"
  | "salary"
  | "transport"
  | "utility"
  | "marketing"
  | "misc";

// ---- Row shapes -------------------------------------------------------------
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
interface ProductRow {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
  type: string | null;
  unit: string;
  selling_price_paise: number;
  wholesale_price_paise: number;
  cost_price_paise: number;
  reorder_point: number;
  gst_rate: number;
  hsn_code: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
interface StockEntryRow {
  id: string;
  product_id: string;
  type: StockMovement;
  quantity: number;
  batch_no: string | null;
  expiry_date: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}
interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  created_at: string;
  updated_at: string;
}
interface PurchaseRow {
  id: string;
  supplier_id: string | null;
  invoice_no: string | null;
  total_amount_paise: number;
  transport_cost_paise: number;
  created_by: string | null;
  created_at: string;
}
interface PurchaseItemRow {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost_paise: number;
  batch_no: string | null;
  expiry_date: string | null;
}
interface PurchaseChargeRow {
  id: string;
  purchase_id: string;
  label: string;
  amount_paise: number;
  created_at: string;
}
interface PriceTierRow {
  id: string;
  product_id: string;
  min_quantity: number;
  price_paise: number;
  created_at: string;
}
interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  customer_type: CustomerType;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
interface SaleRow {
  id: string;
  customer_id: string | null;
  user_id: string | null;
  invoice_no: string;
  subtotal_paise: number;
  discount_paise: number;
  total_paise: number;
  payment_mode: PaymentMode;
  created_at: string;
}
interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price_paise: number;
  total_paise: number;
}
interface ExpenseRow {
  id: string;
  category: ExpenseCategory;
  amount_paise: number;
  note: string | null;
  date: string;
  created_by: string | null;
  created_at: string;
}
interface CustomerPaymentRow {
  id: string;
  customer_id: string;
  amount_paise: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}
interface BusinessSettingsRow {
  id: boolean;
  business_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  state: string | null;
  state_code: string | null;
  invoice_prefix: string;
  default_gst_rate: number;
  logo_url: string | null;
  upi_id: string | null;
  updated_at: string;
}
interface SaleReturnRow {
  id: string;
  sale_id: string;
  customer_id: string | null;
  total_paise: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}
interface SaleReturnItemRow {
  id: string;
  return_id: string;
  product_id: string;
  quantity: number;
  unit_price_paise: number;
  total_paise: number;
}

// ---- View row shapes --------------------------------------------------------
interface CurrentStockRow {
  product_id: string;
  name: string;
  brand: string | null;
  size: string | null;
  type: string | null;
  unit: string;
  reorder_point: number;
  cost_price_paise: number;
  selling_price_paise: number;
  wholesale_price_paise: number;
  stock_in: number;
  stock_out: number;
  current_stock: number;
  is_low_stock: boolean;
  stock_value_paise: number;
}
interface CustomerOutstandingRow {
  customer_id: string;
  name: string;
  phone: string | null;
  customer_type: CustomerType;
  credit_sales_paise: number;
  payments_paise: number;
  outstanding_paise: number;
}
interface ProfitLossRow {
  day: string;
  total_sales_paise: number;
  discount_paise: number;
  cogs_paise: number;
  gross_profit_paise: number;
  expenses_paise: number;
  net_profit_paise: number;
}
interface TopProductRow {
  product_id: string;
  name: string;
  brand: string | null;
  type: string | null;
  qty_sold: number;
  revenue_paise: number;
  cogs_paise: number;
  profit_paise: number;
}
interface GstSummaryRow {
  day: string;
  gst_rate: number;
  invoice_count: number;
  gross_paise: number;
  gst_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
}

// Helpers to satisfy supabase-js generic constraints.
type Table<R, I, U> = { Row: R; Insert: I; Update: U; Relationships: [] };
type View<R> = { Row: R; Relationships: [] };
type Insertable<R, Required extends keyof R, Optional extends keyof R> = Pick<R, Required> &
  Partial<Pick<R, Optional>>;

export interface Database {
  public: {
    Tables: {
      users: Table<
        UserRow,
        Insertable<UserRow, "id" | "email", "name" | "role">,
        Partial<Pick<UserRow, "name" | "role">>
      >;
      products: Table<
        ProductRow,
        Omit<ProductRow, "id" | "created_at" | "updated_at" | "deleted_at"> & { id?: string },
        Partial<Omit<ProductRow, "id" | "created_at" | "updated_at">>
      >;
      stock_entries: Table<
        StockEntryRow,
        Omit<StockEntryRow, "id" | "created_at"> & { id?: string },
        Partial<StockEntryRow>
      >;
      suppliers: Table<
        SupplierRow,
        Omit<SupplierRow, "id" | "created_at" | "updated_at"> & { id?: string },
        Partial<SupplierRow>
      >;
      purchases: Table<PurchaseRow, Partial<PurchaseRow>, Partial<PurchaseRow>>;
      purchase_items: Table<
        PurchaseItemRow,
        Omit<PurchaseItemRow, "id"> & { id?: string },
        Partial<PurchaseItemRow>
      >;
      purchase_charges: Table<
        PurchaseChargeRow,
        Omit<PurchaseChargeRow, "id" | "created_at"> & { id?: string },
        Partial<PurchaseChargeRow>
      >;
      product_price_tiers: Table<
        PriceTierRow,
        Omit<PriceTierRow, "id" | "created_at"> & { id?: string },
        Partial<PriceTierRow>
      >;
      customers: Table<
        CustomerRow,
        Omit<CustomerRow, "id" | "created_at" | "updated_at" | "deleted_at"> & { id?: string },
        Partial<Omit<CustomerRow, "id" | "created_at" | "updated_at">>
      >;
      sales: Table<SaleRow, Partial<SaleRow>, Partial<SaleRow>>;
      sale_items: Table<
        SaleItemRow,
        Omit<SaleItemRow, "id"> & { id?: string },
        Partial<SaleItemRow>
      >;
      expenses: Table<
        ExpenseRow,
        Omit<ExpenseRow, "id" | "created_at"> & { id?: string },
        Partial<ExpenseRow>
      >;
      customer_payments: Table<
        CustomerPaymentRow,
        Omit<CustomerPaymentRow, "id" | "created_at"> & { id?: string },
        Partial<CustomerPaymentRow>
      >;
      business_settings: Table<
        BusinessSettingsRow,
        Partial<BusinessSettingsRow>,
        Partial<BusinessSettingsRow>
      >;
      sale_returns: Table<
        SaleReturnRow,
        Omit<SaleReturnRow, "id" | "created_at"> & { id?: string },
        Partial<SaleReturnRow>
      >;
      sale_return_items: Table<
        SaleReturnItemRow,
        Omit<SaleReturnItemRow, "id"> & { id?: string },
        Partial<SaleReturnItemRow>
      >;
    };
    Views: {
      current_stock_view: View<CurrentStockRow>;
      customer_outstanding_view: View<CustomerOutstandingRow>;
      profit_loss_view: View<ProfitLossRow>;
      top_products_view: View<TopProductRow>;
      gst_summary_view: View<GstSummaryRow>;
    };
    Functions: {
      create_sale: {
        Args: {
          p_customer_id: string | null;
          p_payment_mode: PaymentMode;
          p_discount_paise: number;
          p_items: SaleItemInput[];
        };
        Returns: { sale_id: string; invoice_no: string }[];
      };
      create_purchase: {
        Args: {
          p_supplier_id: string | null;
          p_invoice_no: string | null;
          p_charges: PurchaseChargeInput[];
          p_items: PurchaseItemInput[];
        };
        Returns: string;
      };
      product_price_at_qty: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: number;
      };
      delete_sale: { Args: { p_sale_id: string }; Returns: undefined };
      delete_purchase: { Args: { p_purchase_id: string }; Returns: undefined };
      create_return: {
        Args: { p_sale_id: string; p_items: { product_id: string; quantity: number; unit_price_paise: number }[]; p_note: string | null };
        Returns: string;
      };
      has_any_user: { Args: Record<string, never>; Returns: boolean };
      dashboard_summary: { Args: Record<string, never>; Returns: DashboardSummary };
      current_user_role: { Args: Record<string, never>; Returns: UserRole };
      is_owner: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      stock_movement: StockMovement;
      customer_type: CustomerType;
      payment_mode: PaymentMode;
      expense_category: ExpenseCategory;
    };
    CompositeTypes: Record<string, never>;
  };
}

export interface SaleItemInput {
  product_id: string;
  quantity: number;
  unit_price_paise: number;
}

export interface PurchaseItemInput {
  product_id: string;
  quantity: number;
  unit_cost_paise: number;
  batch_no?: string | null;
  expiry_date?: string | null;
}

export interface PurchaseChargeInput {
  label: string;
  amount_paise: number;
}

export interface DashboardSummary {
  today_sales_paise: number;
  today_expenses_paise: number;
  today_cogs_paise: number;
  today_net_profit_paise: number;
  outstanding_paise: number;
}
