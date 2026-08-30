// Formatter thuần, không chạm tới dữ liệu — an toàn để client import.

const NUMBER = new Intl.NumberFormat("vi-VN");

export function formatNumber(value: number) {
  return NUMBER.format(Math.round(value));
}

/** Rút gọn cho trục biểu đồ: 1.234.567 -> "1,2tr". */
export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return NUMBER.format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits).replace(".", ",")}%`;
}

export function formatSignedPercent(value: number | null, digits = 1) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits).replace(".", ",")}%`;
}

/** "2026-08" -> "T8/2026" */
export function formatMonth(month: string) {
  const [year, m] = month.split("-");
  return `T${Number(m)}/${year}`;
}

/** "2026-08" -> "T8" — dùng cho nhãn trục X cho gọn. */
export function formatMonthShort(month: string) {
  return `T${Number(month.split("-")[1])}`;
}
