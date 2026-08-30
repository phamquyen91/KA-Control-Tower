import type { DataScope } from "./tabs";

// Nhãn và kiểu dữ liệu — không chứa số liệu nên client import được thoải mái.
// Số liệu thật nằm ở `bizData.ts` / `targetData.ts`, cả hai đều server-only.

export const BIZ_SOURCE_SHEET_ID = "1WI5CrcFrTgDR4FNS8Un9RR-oHEvkdJWCj8OUTc2BFtk";
export const BIZ_SOURCE_GID = "1213160480";
export const BIZ_SOURCE_URL = `https://docs.google.com/spreadsheets/d/${BIZ_SOURCE_SHEET_ID}/edit?gid=${BIZ_SOURCE_GID}`;
export const BIZ_SNAPSHOT_AT = "2026-08-19";

export type Lane =
  | "Intra City"
  | "Intra Region"
  | "Cross Region"
  | "Cross Metro";

export type WeightBand = "<15kg" | ">=15kg";

/** Thứ tự lane từ gần tới xa — dùng cho mọi bảng để đọc nhất quán. */
export const LANE_ORDER: Lane[] = [
  "Intra City",
  "Intra Region",
  "Cross Region",
  "Cross Metro",
];

export const WEIGHT_ORDER: WeightBand[] = ["<15kg", ">=15kg"];

/**
 * Nhãn hiển thị của client. "Shopee Standard" là tên gọi thống nhất trên giao
 * diện — trong dữ liệu nguồn nó là "Shopee Express", đổi tên để không lẫn với
 * client khác.
 */
export const SCOPE_LABEL: Record<DataScope, string> = {
  SPB: "Shopee Bulky",
  SPE: "Shopee Standard",
};

/**
 * Nhãn nhóm trọng lượng đọc theo scope: với Bulky đơn nhẹ nhất đã là 10kg nên
 * "<15kg" thực chất là 10–15kg.
 */
export function bandLabel(band: WeightBand, scope: DataScope) {
  if (scope === "SPB") return band === "<15kg" ? "10–15kg" : "15kg++";
  return band === "<15kg" ? "<15kg" : "≥15kg";
}
