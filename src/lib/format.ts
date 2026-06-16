import { format, parseISO } from "date-fns";

// ---- Money (paise <-> rupees) ----------------------------------------------

/** Format integer paise as an Indian-rupee string, e.g. 123450 -> "₹1,234.50". */
export function formatPaise(paise: number | null | undefined): string {
  const value = (paise ?? 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Rupees (number, possibly decimal) -> integer paise. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Integer paise -> rupees number (for form inputs). */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

// ---- Dates -----------------------------------------------------------------

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(typeof iso === "string" ? parseISO(iso) : iso, "dd MMM yyyy");
  } catch {
    return "—";
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd MMM yyyy, hh:mm a");
  } catch {
    return "—";
  }
}

/** YYYY-MM-DD for the current local day. */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** First day of the current month, YYYY-MM-DD. */
export function startOfMonthISO(): string {
  const d = new Date();
  return format(new Date(d.getFullYear(), d.getMonth(), 1), "yyyy-MM-dd");
}

export function formatNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN").format(n ?? 0);
}
