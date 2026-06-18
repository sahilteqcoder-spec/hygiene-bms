import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { InvoiceVM } from "@/lib/invoice";

const rupee = (paise: number) =>
  "Rs. " + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: "#111", fontFamily: "Helvetica" },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1F2D50" },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#B5835A" },
  muted: { color: "#555" },
  border: { borderBottomWidth: 2, borderColor: "#1F2D50", paddingBottom: 8, marginBottom: 8 },
  thead: { flexDirection: "row", backgroundColor: "#1F2D50", color: "#ffffff", borderColor: "#1F2D50", paddingVertical: 5, paddingHorizontal: 2 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#eee", paddingVertical: 4 },
  cIdx: { width: "6%", paddingHorizontal: 3 },
  cItem: { width: "34%", paddingHorizontal: 3 },
  cHsn: { width: "12%", paddingHorizontal: 3 },
  cQty: { width: "10%", paddingHorizontal: 3, textAlign: "right" },
  cRate: { width: "16%", paddingHorizontal: 3, textAlign: "right" },
  cAmt: { width: "22%", paddingHorizontal: 3, textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "auto", width: "45%" },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: "#1F2D50", paddingTop: 3, marginTop: 3, color: "#1F2D50" },
  bold: { fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 30, textAlign: "center", color: "#888", fontSize: 8, borderTopWidth: 1, borderColor: "#eee", paddingTop: 8 },
});

export function InvoicePdf({ vm, upiQr }: { vm: InvoiceVM; upiQr?: string | null }) {
  const b = vm.business;
  const hasGst = vm.gstPaise > 0;
  const dateStr = new Date(vm.date).toLocaleString("en-IN");

  return (
    <Document title={vm.invoiceNo}>
      <Page size="A4" style={s.page}>
        <View style={{ height: 5, backgroundColor: "#B5835A", borderRadius: 2, marginBottom: 8 }} />
        <View style={[s.between, s.border]}>
          <View>
            {b.logo_url ? <Image src={b.logo_url} style={{ height: 36, width: 90, objectFit: "contain", marginBottom: 4 }} /> : null}
            <Text style={s.h1}>{b.business_name}</Text>
            {b.address ? <Text style={s.muted}>{b.address}</Text> : null}
            <Text style={s.muted}>
              {b.phone ? `Ph: ${b.phone}  ` : ""}
              {b.email ?? ""}
            </Text>
            {b.gstin ? <Text>GSTIN: {b.gstin}</Text> : null}
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={s.h2}>{hasGst ? "TAX INVOICE" : "INVOICE"}</Text>
            <Text>No: {vm.invoiceNo}</Text>
            <Text>Date: {dateStr}</Text>
            <Text>Payment: {vm.paymentMode}</Text>
          </View>
        </View>

        <View style={[s.between, s.border]}>
          <View>
            <Text style={s.bold}>BILL TO</Text>
            <Text>{vm.customerName}</Text>
            {vm.customerPhone ? <Text style={s.muted}>{vm.customerPhone}</Text> : null}
            {vm.customerAddress ? <Text style={s.muted}>{vm.customerAddress}</Text> : null}
          </View>
          {b.state ? (
            <Text style={s.muted}>
              Place of supply: {b.state} ({b.state_code})
            </Text>
          ) : null}
        </View>

        <View style={s.thead}>
          <Text style={s.cIdx}>#</Text>
          <Text style={s.cItem}>Item</Text>
          <Text style={s.cHsn}>HSN</Text>
          <Text style={s.cQty}>Qty</Text>
          <Text style={s.cRate}>Rate</Text>
          <Text style={s.cAmt}>Amount</Text>
        </View>
        {vm.lines.map((l, i) => (
          <View key={i} style={s.tr}>
            <Text style={s.cIdx}>{i + 1}</Text>
            <Text style={s.cItem}>{l.name}</Text>
            <Text style={s.cHsn}>{l.hsn}</Text>
            <Text style={s.cQty}>{l.quantity}</Text>
            <Text style={s.cRate}>{rupee(l.unit_price_paise)}</Text>
            <Text style={s.cAmt}>{rupee(l.total_paise)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.tRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{rupee(vm.subtotalPaise)}</Text>
          </View>
          {vm.discountPaise > 0 ? (
            <View style={s.tRow}>
              <Text style={s.muted}>Discount</Text>
              <Text>- {rupee(vm.discountPaise)}</Text>
            </View>
          ) : null}
          {hasGst ? (
            <>
              <View style={s.tRow}>
                <Text style={s.muted}>Taxable</Text>
                <Text>{rupee(vm.taxablePaise)}</Text>
              </View>
              <View style={s.tRow}>
                <Text style={s.muted}>CGST</Text>
                <Text>{rupee(vm.cgstPaise)}</Text>
              </View>
              <View style={s.tRow}>
                <Text style={s.muted}>SGST</Text>
                <Text>{rupee(vm.sgstPaise)}</Text>
              </View>
            </>
          ) : null}
          <View style={s.grand}>
            <Text style={s.bold}>Grand Total</Text>
            <Text style={s.bold}>{rupee(vm.totalPaise)}</Text>
          </View>
        </View>

        {/* UPI QR + amount in words */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {upiQr ? (
              <>
                <Image src={upiQr} style={{ width: 70, height: 70 }} />
                <View style={{ marginLeft: 6 }}>
                  <Text style={[s.bold, { color: "#1F2D50" }]}>Scan to pay (UPI)</Text>
                  <Text style={s.muted}>{b.upi_id}</Text>
                </View>
              </>
            ) : null}
          </View>
          <View style={{ width: "55%" }}>
            <Text style={s.muted}>Amount in words:</Text>
            <Text style={s.bold}>{vm.amountInWords}</Text>
          </View>
        </View>

        <Text style={s.footer}>This is a computer-generated invoice. Thank you for your business!</Text>
      </Page>
    </Document>
  );
}
