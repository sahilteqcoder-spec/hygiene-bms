import { formatPaise, formatDateTime } from "@/lib/format";
import type { InvoiceVM } from "@/lib/invoice";

// Printable HTML invoice (GST tax invoice). The `.print-area` class strips
// shadows when printed; surrounding chrome carries `.no-print`.
export function InvoicePreview({ vm, upiQr }: { vm: InvoiceVM; upiQr?: string | null }) {
  const b = vm.business;
  const hasGst = vm.gstPaise > 0;

  return (
    <div className="print-area mx-auto max-w-3xl overflow-hidden rounded-lg border bg-white text-sm text-black shadow-sm">
      <div className="h-2 w-full bg-gradient-to-r from-[#1F2D50] via-[#B5835A] to-[#1F2D50]" />
      <div className="p-5 sm:p-8 md:p-10">
      <div className="flex flex-col gap-4 border-b-2 border-[#1F2D50] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          {b.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo_url} alt={b.business_name} className="mb-2 h-12 w-auto object-contain" />
          )}
          <h1 className="text-lg font-bold text-[#1F2D50] sm:text-xl">{b.business_name}</h1>
          {b.address && <p className="text-xs text-gray-600">{b.address}</p>}
          <p className="text-xs text-gray-600">
            {b.phone && <>☎ {b.phone} </>}
            {b.email && <>· {b.email}</>}
          </p>
          {b.gstin && <p className="pt-1 text-xs">GSTIN: <span className="font-medium">{b.gstin}</span></p>}
        </div>
        <div className="space-y-0.5 sm:text-right">
          <h2 className="text-base font-semibold text-[#B5835A] sm:text-lg">{hasGst ? "TAX INVOICE" : "INVOICE"}</h2>
          <p className="text-xs">No: <span className="font-medium">{vm.invoiceNo}</span></p>
          <p className="text-xs">Date: {formatDateTime(vm.date)}</p>
          <p className="text-xs capitalize">Payment: {vm.paymentMode}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 py-5 sm:flex-row sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Bill To</p>
          <p className="font-medium">{vm.customerName}</p>
          {vm.customerPhone && <p className="text-xs text-gray-600">{vm.customerPhone}</p>}
          {vm.customerAddress && <p className="text-xs text-gray-600">{vm.customerAddress}</p>}
        </div>
        {b.state && (
          <div className="text-xs text-gray-600 sm:text-right">
            <p>Place of supply: {b.state} ({b.state_code})</p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] border-collapse text-xs">
        <thead>
          <tr className="bg-[#1F2D50] text-left text-white">
            <th className="p-2">#</th>
            <th className="p-2">Item</th>
            <th className="p-2">HSN</th>
            <th className="p-2 text-right">Qty</th>
            <th className="p-2 text-right">Rate</th>
            {hasGst && <th className="p-2 text-right">GST%</th>}
            <th className="p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {vm.lines.map((l, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{i + 1}</td>
              <td className="p-2">{l.name}</td>
              <td className="p-2">{l.hsn}</td>
              <td className="p-2 text-right">{l.quantity}</td>
              <td className="p-2 text-right">{formatPaise(l.unit_price_paise)}</td>
              {hasGst && <td className="p-2 text-right">{l.gst_rate}%</td>}
              <td className="p-2 text-right">{formatPaise(l.total_paise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: UPI QR + amount in words */}
        <div className="space-y-3">
          {upiQr && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={upiQr} alt="Scan to pay" className="h-24 w-24 rounded border" />
              <div className="text-xs">
                <p className="font-semibold text-[#1F2D50]">Scan to pay via UPI</p>
                <p className="text-gray-500">{b.upi_id}</p>
              </div>
            </div>
          )}
          <p className="max-w-xs text-xs">
            <span className="text-gray-500">Amount in words: </span>
            <span className="font-medium">{vm.amountInWords}</span>
          </p>
        </div>

        {/* Right: totals */}
        <div className="w-full space-y-1.5 text-xs sm:w-64">
          <Row label="Subtotal" value={formatPaise(vm.subtotalPaise)} />
          {vm.discountPaise > 0 && <Row label="Discount" value={`− ${formatPaise(vm.discountPaise)}`} />}
          {hasGst && (
            <>
              <Row label="Taxable value" value={formatPaise(vm.taxablePaise)} />
              <Row label="CGST" value={formatPaise(vm.cgstPaise)} />
              <Row label="SGST" value={formatPaise(vm.sgstPaise)} />
            </>
          )}
          <div className="mt-1 flex justify-between border-t-2 border-[#1F2D50] pt-2 text-sm font-bold text-[#1F2D50]">
            <span>Grand Total</span>
            <span>{formatPaise(vm.totalPaise)}</span>
          </div>
        </div>
      </div>

      <p className="mt-8 border-t pt-5 text-center text-[10px] text-gray-500">
        This is a computer-generated invoice. Thank you for your business!
      </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
