import { formatPaise, formatDateTime } from "@/lib/format";
import type { InvoiceVM } from "@/lib/invoice";

// Printable HTML invoice (GST tax invoice). The `.print-area` class strips
// shadows when printed; surrounding chrome carries `.no-print`.
export function InvoicePreview({ vm }: { vm: InvoiceVM }) {
  const b = vm.business;
  const hasGst = vm.gstPaise > 0;

  return (
    <div className="print-area mx-auto max-w-3xl rounded-lg border bg-white p-8 text-sm text-black shadow-sm">
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">{b.business_name}</h1>
          {b.address && <p className="text-xs text-gray-600">{b.address}</p>}
          <p className="text-xs text-gray-600">
            {b.phone && <>☎ {b.phone} </>}
            {b.email && <>· {b.email}</>}
          </p>
          {b.gstin && <p className="mt-1 text-xs">GSTIN: <span className="font-medium">{b.gstin}</span></p>}
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold">{hasGst ? "TAX INVOICE" : "INVOICE"}</h2>
          <p className="text-xs">No: <span className="font-medium">{vm.invoiceNo}</span></p>
          <p className="text-xs">Date: {formatDateTime(vm.date)}</p>
          <p className="text-xs capitalize">Payment: {vm.paymentMode}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4">
        <div>
          <p className="text-xs font-semibold text-gray-500">BILL TO</p>
          <p className="font-medium">{vm.customerName}</p>
          {vm.customerPhone && <p className="text-xs text-gray-600">{vm.customerPhone}</p>}
          {vm.customerAddress && <p className="text-xs text-gray-600">{vm.customerAddress}</p>}
        </div>
        {b.state && (
          <div className="text-right text-xs text-gray-600">
            <p>Place of supply: {b.state} ({b.state_code})</p>
          </div>
        )}
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y bg-gray-50 text-left">
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

      <div className="ml-auto mt-4 w-64 space-y-1 text-xs">
        <Row label="Subtotal" value={formatPaise(vm.subtotalPaise)} />
        {vm.discountPaise > 0 && <Row label="Discount" value={`− ${formatPaise(vm.discountPaise)}`} />}
        {hasGst && (
          <>
            <Row label="Taxable value" value={formatPaise(vm.taxablePaise)} />
            <Row label="CGST" value={formatPaise(vm.cgstPaise)} />
            <Row label="SGST" value={formatPaise(vm.sgstPaise)} />
          </>
        )}
        <div className="flex justify-between border-t pt-1 text-sm font-bold">
          <span>Grand Total</span>
          <span>{formatPaise(vm.totalPaise)}</span>
        </div>
      </div>

      <p className="mt-8 border-t pt-4 text-center text-[10px] text-gray-500">
        This is a computer-generated invoice. Thank you for your business!
      </p>
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
