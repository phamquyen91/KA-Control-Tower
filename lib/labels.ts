import type { DataScope } from "./tabs";

// Nhãn và kiểu dữ liệu — không chứa số liệu nên client import được thoải mái.
// Số liệu thật nằm ở `bizData.ts` / `targetData.ts`, cả hai đều server-only.

export const BIZ_SOURCE_SHEET_ID = "1WI5CrcFrTgDR4FNS8Un9RR-oHEvkdJWCj8OUTc2BFtk";
export const BIZ_SOURCE_GID = "1213160480";
export const BIZ_SOURCE_URL = `https://docs.google.com/spreadsheets/d/${BIZ_SOURCE_SHEET_ID}/edit?gid=${BIZ_SOURCE_GID}`;
export const BIZ_SNAPSHOT_AT = "2026-09-02";

/**
 * Ngày cuối cùng có số liệu thực tế trong sheet `vol`.
 *
 * Sheet chạy tự động mỗi sáng, nạp số của ngày hôm trước. Nên dữ liệu luôn
 * dừng ở đúng một ngày trước ngày lấy snapshot — suy ra được, không cần khai
 * tay và không sợ quên cập nhật: đổi `BIZ_SNAPSHOT_AT` là ngày này tự theo.
 */
export const BIZ_DATA_THROUGH = (() => {
  const d = new Date(`${BIZ_SNAPSHOT_AT}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
})();

/**
 * Giá trị lane giữ đúng như trong nguồn, kể cả cách viết hoa và dấu sao.
 * `Cross metro *` là loại riêng, tồn tại song song với `Cross metro` — không gộp.
 * `Không xác định` gom các dòng nguồn thiếu lane, để tổng vẫn khớp.
 */
export type Lane =
  | "Intra city"
  | "Intra region"
  | "Cross region"
  | "Cross metro"
  | "Cross metro *"
  | "Không xác định";

export type DeliveryTeam = "AHM" | "GHN";

export type WeightBand = "<15kg" | ">=15kg";

/** Thứ tự lane từ gần tới xa — dùng cho mọi bảng để đọc nhất quán. */
export const LANE_ORDER: Lane[] = [
  "Intra city",
  "Intra region",
  "Cross region",
  "Cross metro",
  "Cross metro *",
  "Không xác định",
];

/** Thứ tự đội giao — AHM trước để so với GHN cho nhất quán mọi bảng. */
export const TEAM_ORDER: DeliveryTeam[] = ["AHM", "GHN"];

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
