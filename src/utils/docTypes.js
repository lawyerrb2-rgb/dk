export const DOC_TYPES = {
  quotation: { label: "ใบเสนอราคา", prefix: "QT", color: "bg-frost-100 text-frost-600" },
  invoice: { label: "ใบวางบิล/แจ้งหนี้", prefix: "IV", color: "bg-clay-500/10 text-clay-600" },
  receipt: { label: "ใบเสร็จรับเงิน", prefix: "RC", color: "bg-frost-600/10 text-frost-700" },
};

export function emptyItem() {
  return { description: "", quantity: 1, unit: "หน่วย", unit_price: 0 };
}

export function calcTotals(items, discount, vatPercent) {
  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const afterDiscount = Math.max(subtotal - (Number(discount) || 0), 0);
  const vatAmount = afterDiscount * ((Number(vatPercent) || 0) / 100);
  const grandTotal = afterDiscount + vatAmount;
  return { subtotal, vatAmount, grandTotal };
}

export function formatMoney(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
