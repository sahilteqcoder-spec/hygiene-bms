import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PriceListPdf, type PriceListProduct, type PriceRow } from "@/components/price-list-pdf";

export const runtime = "nodejs";

// Convert base price + sorted tiers into readable quantity ranges:
//   base + [{20,650},{100,550}]  ->  "1–19": base, "20–99": 650, "100+": 550
function buildPriceRows(
  basePaise: number,
  tiers: { min_quantity: number; price_paise: number }[]
): PriceRow[] {
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  const rows: PriceRow[] = [];
  let startQty = 1;
  let price = basePaise;

  for (const t of sorted) {
    const endQty = t.min_quantity - 1;
    if (endQty >= startQty) {
      rows.push({ label: startQty === endQty ? `${startQty}` : `${startQty}–${endQty}`, price_paise: price });
    }
    startQty = t.min_quantity;
    price = t.price_paise;
  }
  rows.push({ label: rows.length === 0 ? "Any qty" : `${startQty}+`, price_paise: price });
  return rows;
}

// GET /api/price-list -> a shareable PDF of every active product's price
// (base + quantity tiers). Useful to send customers on WhatsApp/email.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const [{ data: products }, { data: tiers }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, brand, size, type, unit, selling_price_paise")
      .is("deleted_at", null)
      .order("name"),
    supabase.from("product_price_tiers").select("product_id, min_quantity, price_paise"),
    supabase.from("business_settings").select("*").single(),
  ]);

  if (!settings) return NextResponse.json({ error: "Settings missing" }, { status: 500 });

  // Group tiers by product, sorted ascending by min quantity.
  const tiersByProduct = new Map<string, { min_quantity: number; price_paise: number }[]>();
  for (const t of tiers ?? []) {
    const arr = tiersByProduct.get(t.product_id) ?? [];
    arr.push({ min_quantity: t.min_quantity, price_paise: t.price_paise });
    tiersByProduct.set(t.product_id, arr);
  }

  const list: PriceListProduct[] = (products ?? []).map((p) => ({
    name: p.name,
    sub: [p.brand, p.size, p.type].filter(Boolean).join(" · "),
    unit: p.unit,
    rows: buildPriceRows(p.selling_price_paise, tiersByProduct.get(p.id) ?? []),
  }));

  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const element = createElement(PriceListPdf, {
    business: settings,
    products: list,
    date,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="price-list.pdf"`,
    },
  });
}
