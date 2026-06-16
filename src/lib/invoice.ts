import { gstFromInclusive } from "@/lib/calculations";
import type { SaleWithItems } from "@/types/sales";
import type { Database } from "@/types/database";

type Settings = Database["public"]["Tables"]["business_settings"]["Row"];

export interface InvoiceLineVM {
  name: string;
  hsn: string;
  quantity: number;
  unit_price_paise: number;
  gst_rate: number;
  taxable_paise: number;
  gst_paise: number;
  total_paise: number;
}

export interface InvoiceVM {
  business: Settings;
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  paymentMode: string;
  lines: InvoiceLineVM[];
  subtotalPaise: number;
  discountPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  gstPaise: number;
  totalPaise: number;
}

// Builds a fully-computed invoice from a sale, splitting GST per line
// (treating line totals as GST-inclusive — Indian retail convention).
export function buildInvoiceVM(sale: SaleWithItems, settings: Settings): InvoiceVM {
  const lines: InvoiceLineVM[] = sale.sale_items.map((item) => {
    const { taxablePaise, gstPaise } = gstFromInclusive(item.total_paise, item.product.gst_rate);
    return {
      name: item.product.name,
      hsn: item.product.hsn_code ?? "—",
      quantity: item.quantity,
      unit_price_paise: item.unit_price_paise,
      gst_rate: item.product.gst_rate,
      taxable_paise: taxablePaise,
      gst_paise: gstPaise,
      total_paise: item.total_paise,
    };
  });

  const gstTotal = lines.reduce((s, l) => s + l.gst_paise, 0);
  const half = Math.round(gstTotal / 2);

  return {
    business: settings,
    invoiceNo: sale.invoice_no,
    date: sale.created_at,
    customerName: sale.customer?.name ?? "Walk-in Customer",
    customerPhone: sale.customer?.phone ?? null,
    customerAddress: sale.customer?.address ?? null,
    paymentMode: sale.payment_mode,
    lines,
    subtotalPaise: sale.subtotal_paise,
    discountPaise: sale.discount_paise,
    taxablePaise: lines.reduce((s, l) => s + l.taxable_paise, 0),
    cgstPaise: half,
    sgstPaise: gstTotal - half,
    gstPaise: gstTotal,
    totalPaise: sale.total_paise,
  };
}

// Fetch a sale with everything the invoice needs. Returns null if not found.
export async function fetchSaleWithItems(
  supabase: any,
  saleId: string
): Promise<SaleWithItems | null> {
  const { data } = await supabase
    .from("sales")
    .select(
      `id, customer_id, user_id, invoice_no, subtotal_paise, discount_paise, total_paise, payment_mode, created_at,
       customer:customers(id, name, phone, address),
       user:users(id, name),
       sale_items(id, sale_id, product_id, quantity, unit_price_paise, total_paise,
                  product:products(name, hsn_code, gst_rate))`
    )
    .eq("id", saleId)
    .single();
  return (data as SaleWithItems) ?? null;
}
