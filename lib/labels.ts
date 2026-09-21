import type { DataScope } from "./tabs";

// Nhãn và kiểu dữ liệu — không chứa số liệu nên client import được thoải mái.
// Số liệu thật nằm ở `bizData.ts` / `targetData.ts`, cả hai đều server-only.

// Sheet "KA control tower dest" — bản đích do tài khoản kasghn2026@gmail.com sở
// hữu, nhận dữ liệu từ sheet gốc trong Workspace GHN. Đặt ngoài Workspace vì
// chính sách GHN cấm share cho service account; sheet vẫn private (chỉ share
// đích danh), không publish to web.
export const BIZ_SOURCE_SHEET_ID = "1dK61YVEnTxhnD8Kc1dIkhVmhVxcablJCJrlUwomjpMg";
export const BIZ_SOURCE_GID = "364413449";
export const BIZ_SOURCE_URL = `https://docs.google.com/spreadsheets/d/${BIZ_SOURCE_SHEET_ID}/edit?gid=${BIZ_SOURCE_GID}`;
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
