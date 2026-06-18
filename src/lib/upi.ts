import QRCode from "qrcode";

// Build a UPI deep-link string (works with GPay/PhonePe/Paytm scanners).
export function buildUpiUri(upiId: string, payeeName: string, amountPaise: number): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: (amountPaise / 100).toFixed(2),
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
}

// Returns a PNG data-URL QR for the UPI payment, or null if no UPI id is set.
// Server-only (uses the `qrcode` node package).
export async function upiQrDataUrl(
  upiId: string | null | undefined,
  payeeName: string,
  amountPaise: number
): Promise<string | null> {
  if (!upiId) return null;
  try {
    const uri = buildUpiUri(upiId, payeeName, amountPaise);
    return await QRCode.toDataURL(uri, { margin: 1, width: 220 });
  } catch {
    return null;
  }
}
