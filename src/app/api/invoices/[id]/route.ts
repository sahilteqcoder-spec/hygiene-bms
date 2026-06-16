import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { buildInvoiceVM, fetchSaleWithItems } from "@/lib/invoice";
import { InvoicePdf } from "@/components/invoice-pdf";

export const runtime = "nodejs";

// GET /api/invoices/:id  -> streams the invoice PDF.
//   ?store=1  also uploads the PDF to the private `invoices` storage bucket.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const sale = await fetchSaleWithItems(supabase, id);
  if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

  const { data: settings } = await supabase.from("business_settings").select("*").single();
  if (!settings) return NextResponse.json({ error: "Settings missing" }, { status: 500 });

  const vm = buildInvoiceVM(sale, settings);
  const element = createElement(InvoicePdf, { vm }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);
  const body = new Uint8Array(buffer);

  // Optionally persist to Storage for archival.
  if (req.nextUrl.searchParams.get("store") === "1") {
    await supabase.storage
      .from("invoices")
      .upload(`${sale.invoice_no}.pdf`, body, { contentType: "application/pdf", upsert: true });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${sale.invoice_no}.pdf"`,
    },
  });
}
