import { z } from "zod";

// Shared Zod schemas. Forms use these via @hookform/resolvers/zod and Server
// Actions re-validate with the same schemas before touching the database.

// Money fields are entered in rupees in the UI and converted to paise on submit.
const rupees = z.coerce
  .number({ invalid_type_error: "Enter a valid amount" })
  .min(0, "Cannot be negative");

const positiveInt = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .int("Must be a whole number")
  .min(0, "Cannot be negative");

// ---- Product ----------------------------------------------------------------
// A quantity price tier: "buy >= min_quantity, pay this price".
export const priceTierSchema = z.object({
  min_quantity: z.coerce.number().int().min(1, "Min qty ≥ 1"),
  price: rupees,
});

export const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  brand: z.string().optional().or(z.literal("")),
  size: z.string().optional().or(z.literal("")),
  type: z.string().optional().or(z.literal("")),
  unit: z.string().min(1, "Unit is required").default("piece"),
  selling_price: rupees, // base price (used below the smallest tier)
  wholesale_price: rupees.optional().default(0),
  cost_price: rupees,
  reorder_point: positiveInt.default(0),
  gst_rate: z.coerce.number().min(0).max(100).default(0),
  hsn_code: z.string().optional().or(z.literal("")),
  // Optional quantity-based tiers, e.g. [{min_quantity:20, price:18}, {min_quantity:1000, price:15}]
  tiers: z.array(priceTierSchema).default([]),
});
export type ProductFormValues = z.infer<typeof productSchema>;

// ---- Stock adjustment -------------------------------------------------------
export const stockSchema = z.object({
  product_id: z.string().uuid("Select a product"),
  type: z.enum(["in", "out"]),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  batch_no: z.string().optional().or(z.literal("")),
  expiry_date: z.string().optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
});
export type StockFormValues = z.infer<typeof stockSchema>;

// ---- Supplier ---------------------------------------------------------------
export const supplierSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  gstin: z.string().optional().or(z.literal("")),
});
export type SupplierFormValues = z.infer<typeof supplierSchema>;

// ---- Customer ---------------------------------------------------------------
export const customerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  customer_type: z.enum(["retail", "wholesale"]).default("retail"),
});
export type CustomerFormValues = z.infer<typeof customerSchema>;

// ---- Expense ----------------------------------------------------------------
export const expenseSchema = z.object({
  category: z.enum(["rent", "salary", "transport", "utility", "marketing", "misc"]),
  amount: rupees.refine((v) => v > 0, "Amount must be greater than 0"),
  note: z.string().optional().or(z.literal("")),
  date: z.string().min(1, "Date is required"),
});
export type ExpenseFormValues = z.infer<typeof expenseSchema>;

// ---- Customer payment -------------------------------------------------------
export const paymentSchema = z.object({
  customer_id: z.string().uuid(),
  amount: rupees.refine((v) => v > 0, "Amount must be greater than 0"),
  note: z.string().optional().or(z.literal("")),
});
export type PaymentFormValues = z.infer<typeof paymentSchema>;

// ---- Sale -------------------------------------------------------------------
export const saleLineSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  unit_price_paise: z.coerce.number().int().min(0),
});
export const saleSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  payment_mode: z.enum(["cash", "upi", "credit"]).default("cash"),
  discount: rupees.default(0),
  items: z.array(saleLineSchema).min(1, "Add at least one product"),
});
export type SaleFormValues = z.infer<typeof saleSchema>;

// ---- Purchase ---------------------------------------------------------------
export const purchaseLineSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  unit_cost: rupees,
  batch_no: z.string().optional().or(z.literal("")),
  expiry_date: z.string().optional().or(z.literal("")),
});
export const purchaseChargeSchema = z.object({
  label: z.string().min(1, "Label required"),
  amount: rupees,
});
export const purchaseSchema = z.object({
  supplier_id: z.string().uuid().nullable().optional(),
  invoice_no: z.string().optional().or(z.literal("")),
  charges: z.array(purchaseChargeSchema).default([]),
  items: z.array(purchaseLineSchema).min(1, "Add at least one product"),
});
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;

// ---- Business settings ------------------------------------------------------
export const settingsSchema = z.object({
  business_name: z.string().min(2, "Business name is required"),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gstin: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  state_code: z.string().optional().or(z.literal("")),
  invoice_prefix: z.string().min(1, "Prefix is required").default("INV"),
  default_gst_rate: z.coerce.number().min(0).max(100).default(0),
  upi_id: z.string().optional().or(z.literal("")),
});
export type SettingsFormValues = z.infer<typeof settingsSchema>;

// ---- New staff user ---------------------------------------------------------
export const newUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Minimum 8 characters"),
  role: z.enum(["owner", "staff"]).default("staff"),
});
export type NewUserFormValues = z.infer<typeof newUserSchema>;

// ---- Auth -------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;
