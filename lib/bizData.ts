import "server-only";

import { getDatasets, type DataSource } from "./sheetSource";
import type { BizRow } from "./sheetParse";

export type { BizRow } from "./sheetParse";

// Tab Tình hình kinh doanh: sản lượng tháng từ tab `vol`.
//
// Số liệu đến từ lib/sheetSource.ts (đọc sheet trực tiếp, hoặc bản chụp khi
// không có service account). Module này chỉ gói lại thành dataset cho metrics
// dùng — không giữ số nào trong code nữa.
//
// LƯU Ý VỀ LANE: nguồn có `Cross metro *` là loại riêng, tồn tại song song với
// `Cross metro` — giữ tách chứ không gộp. Các dòng thiếu lane gom vào
// "Không xác định" thay vì bỏ đi, để tổng vẫn khớp nguồn.
//
// LƯU Ý VỀ ĐỘI GIAO: tab `vol` đã có lúc bỏ cột `delivery_team`. `hasTeam`
// nói rõ nguồn hiện có bóc theo đội hay không; không có thì bảng đội giao phải
// báo thiếu nguồn chứ không hiện toàn 0.

export interface BizDataset {
  rows: BizRow[];
  /** Các tháng có mặt trong dữ liệu, tăng dần. */
  months: string[];
  hasTeam: boolean;
  source: DataSource;
}

export async function getBizDataset(): Promise<BizDataset> {
  const { vol, source } = await getDatasets();
  return {
    rows: vol.rows,
    months: [...new Set(vol.rows.map((r) => r.month))].sort(),
    hasTeam: vol.hasTeam,
    source,
  };
}
