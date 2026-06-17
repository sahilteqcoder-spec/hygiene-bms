import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PriceListPdf, type PriceListProduct } from "@/components/price-list-pdf";

export const runtime = "nodejs";

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
    base_paise: p.selling_price_paise,
    tiers: (tiersByProduct.get(p.id) ?? []).sort((a, b) => a.min_quantity - b.min_quantity),
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
