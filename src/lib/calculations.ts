// Pure business-logic helpers. All money is in integer paise.

export interface SaleLineLike {
  quantity: number;
  unit_price_paise: number;
}
export interface CostedLineLike {
  quantity: number;
  cost_price_paise: number;
}

/** Subtotal = Σ(quantity × unit price). */
export function subtotalPaise(lines: SaleLineLike[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.unit_price_paise, 0);
}

/** Sale total after discount (never below zero). */
export function saleTotalPaise(lines: SaleLineLike[], discountPaise: number): number {
  return Math.max(0, subtotalPaise(lines) - Math.max(0, discountPaise));
}

/** COGS = Σ(quantity × cost price). */
export function cogsPaise(lines: CostedLineLike[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.cost_price_paise, 0);
}

/** Net Profit = Total Sales − COGS − Expenses. */
export function netProfitPaise(
  totalSalesPaise: number,
  totalCogsPaise: number,
  totalExpensesPaise: number
): number {
  return totalSalesPaise - totalCogsPaise - totalExpensesPaise;
}

/** Gross Margin % = ((Selling − Cost) / Selling) × 100. */
export function grossMarginPct(
  sellingPricePaise: number,
  costPricePaise: number
): number {
  if (sellingPricePaise <= 0) return 0;
  return ((sellingPricePaise - costPricePaise) / sellingPricePaise) * 100;
}

/** Stock balance = stock_in − stock_out. */
export function stockBalance(stockIn: number, stockOut: number): number {
  return stockIn - stockOut;
}

/** Customer outstanding = credit_sales − payments. */
export function outstandingPaise(creditSalesPaise: number, paymentsPaise: number): number {
  return creditSalesPaise - paymentsPaise;
}

/** Reorder alert when current stock has fallen to or below the reorder point. */
export function needsReorder(currentStock: number, reorderPoint: number): boolean {
  return currentStock <= reorderPoint;
}

/**
 * Quantity-based tiered price. Picks the tier with the largest min_quantity
 * that is <= quantity; falls back to the product's base price when none apply.
 * Mirrors the SQL function public.product_price_at_qty.
 */
export function tierPricePaise(
  basePricePaise: number,
  tiers: { min_quantity: number; price_paise: number }[],
  quantity: number
): number {
  const qty = Math.max(quantity, 1);
  const applicable = tiers
    .filter((t) => t.min_quantity <= qty)
    .sort((a, b) => b.min_quantity - a.min_quantity);
  return applicable.length ? applicable[0].price_paise : basePricePaise;
}

/**
 * GST split from a GST-INCLUSIVE amount (Indian retail MRP convention).
 * gst = total × rate / (100 + rate); taxable = total − gst.
 */
export function gstFromInclusive(totalPaise: number, gstRate: number) {
  if (gstRate <= 0) {
    return { taxablePaise: totalPaise, gstPaise: 0, cgstPaise: 0, sgstPaise: 0 };
  }
  const gstPaise = Math.round((totalPaise * gstRate) / (100 + gstRate));
  const taxablePaise = totalPaise - gstPaise;
  const half = Math.round(gstPaise / 2);
  return { taxablePaise, gstPaise, cgstPaise: half, sgstPaise: gstPaise - half };
}
