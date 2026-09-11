import "server-only";

import {
  campaignDate,
  campaignList,
  type CampaignAgg,
  type OprRow,
} from "./sheetParse";
import { getDatasets, type DataSource } from "./sheetSource";

export type {
  CampaignProvince,
  CampaignTeam,
  CampaignTotal,
  CampaignType,
  DayOffset,
  Direction,
  OprRow,
} from "./sheetParse";
export type { DeliveryTeam } from "./labels";

// Tab Campaign Shopee: ODR/OPR quanh các ngày campaign, từ tab `DD` và `DD OPR`.
//
// Số liệu đến từ lib/sheetSource.ts (đọc sheet trực tiếp, hoặc bản chụp khi
// không có service account). Module này gói lại thành dataset cho metrics.
//
// LƯU Ý VỀ SO SÁNH: `baseline` (ngày thường) chỉ có ở D0. Vì vậy mọi so sánh
// campaign với ngày thường phải là CP D0 ↔ baseline D0. Đem CP D+1 so với
// baseline là sai loại.
//
// LƯU Ý VỀ ĐỘ CHÍN: ODR/OPR của một kỳ chỉ đáng tin khi đơn đã có đủ thời gian
// giao xong. Kỳ vừa diễn ra vài ngày trước ngày chốt dữ liệu sẽ có ODR thấp
// giả tạo (đơn còn đang đi đường bị tính là chưa đúng hạn). `settleDays` là
// số ngày tối thiểu sau D+1 để coi con số là đã chốt.

/** Số tỉnh/thành sau sáp nhập 2025 — mẫu số cho "phủ bao nhiêu tỉnh". */
export const TOTAL_PROVINCES = 34;

/**
 * Bulky liên miền SLA 3–4 ngày; cộng thêm buffer cho đơn giao lại. Trước mốc
 * này ODR chưa phản ánh chất lượng thật, chỉ phản ánh đơn chưa tới nơi.
 */
export const SETTLE_DAYS = 5;

export interface CampaignDataset extends CampaignAgg {
  opr: OprRow[];
  /** Các kỳ campaign trong dữ liệu, xếp theo ngày diễn ra. */
  campaigns: string[];
  /** Năm dữ liệu — suy ngày campaign từ nhãn "CP 9.9". */
  year: number;
  source: DataSource;
}

export async function getCampaignDataset(): Promise<CampaignDataset> {
  const { campaign, opr, source } = await getDatasets();
  const year = Number(source.dataThrough.slice(0, 4));
  return {
    ...campaign,
    opr,
    campaigns: campaignList(campaign.totals, year),
    year,
    source,
  };
}

/** Ngày D và D+1 của một kỳ; undefined khi nhãn không đọc ra ngày. */
export function campaignDays(
  ds: CampaignDataset,
  campaign: string,
): { d0: string; d1: string } | undefined {
  const d0 = campaignDate(campaign, ds.year);
  if (!d0) return undefined;
  const d = new Date(`${d0}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return { d0, d1: d.toISOString().slice(0, 10) };
}

/** Kỳ đã đủ ngày để ODR/OPR chốt chưa. Không đọc được ngày thì coi như đã chốt. */
export function isSettled(ds: CampaignDataset, campaign: string): boolean {
  const days = campaignDays(ds, campaign);
  if (!days) return true;
  const d = new Date(`${days.d1}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + SETTLE_DAYS);
  return ds.source.dataThrough >= d.toISOString().slice(0, 10);
}
