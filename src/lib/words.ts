// Indian-system number → words (lakh / crore), for invoice "amount in words".

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return (h ? ONES[h] + " Hundred" + (rest ? " " : "") : "") + (rest ? twoDigits(rest) : "");
}

// Integer rupees to words using the Indian numbering system.
function integerToWords(num: number): string {
  if (num === 0) return "Zero";
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = num % 1000;

  const parts: string[] = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ").trim();
}

/** "₹1,23,450.50" → "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty and Fifty Paise Only" */
export function rupeesInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const paiseRem = paise % 100;
  let words = "Rupees " + integerToWords(rupees);
  if (paiseRem > 0) words += " and " + twoDigits(paiseRem) + " Paise";
  return words + " Only";
}
