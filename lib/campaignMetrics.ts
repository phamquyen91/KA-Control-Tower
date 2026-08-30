import "server-only";

import {
  CAMPAIGNS,
  CAMPAIGN_PROVINCES,
  CAMPAIGN_TOTALS,
  type DayOffset,
  type Direction,
} from "./campaignData";
import type { DataScope } from "./tabs";

export interface OdrCell {
  orders: number;
  ontime: number;
  /** ontime / orders — tính lại theo trọng số, không lấy trung bình cộng ODR. */
  odr: number;
}

const EMPTY: OdrCell = { orders: 0, ontime: 0, odr: 0 };

function cell(orders: number, ontime: number): OdrCell {
  return { orders, ontime, odr: orders === 0 ? 0 : ontime / orders };
}

function lookup(
  scope: DataScope,
  campaign: string,
  type: "CP" | "baseline",
  day: DayOffset,
): OdrCell {
  const row = CAMPAIGN_TOTALS.find(
    (r) =>
      r.scope === scope &&
      r.campaign === campaign &&
      r.type === type &&
      r.day === day,
  );
  return row ? cell(row.orders, row.ontime) : EMPTY;
}

export interface CampaignRow {
  campaign: string;
  cpD0: OdrCell;
  cpD1: OdrCell;
  /** Ngày thường, chỉ tồn tại ở D0 — nên chỉ so được với cpD0. */
  baselineD0: OdrCell;
  /** Chênh lệch ODR theo điểm phần trăm: CP D0 − baseline D0. */
  deltaD0Pp: number;
  /** Tổng đơn trong mẫu của campaign (D0 + D+1). */
  cpOrders: number;
}

export function campaignRows(scope: DataScope): CampaignRow[] {
  return CAMPAIGNS.map((campaign) => {
    const cpD0 = lookup(scope, campaign, "CP", "D0");
    const cpD1 = lookup(scope, campaign, "CP", "D+1");
    const baselineD0 = lookup(scope, campaign, "baseline", "D0");
    return {
      campaign,
      cpD0,
      cpD1,
      baselineD0,
      deltaD0Pp: (cpD0.odr - baselineD0.odr) * 100,
      cpOrders: cpD0.orders + cpD1.orders,
    };
  });
}

export function latestCampaign(): string {
  return CAMPAIGNS[CAMPAIGNS.length - 1];
}

export interface ProvinceRow extends OdrCell {
  province: string;
}

/**
 * Xếp hạng tỉnh theo ODR trong một campaign.
 * `minOrders` để loại các tỉnh mẫu quá nhỏ — vài đơn là ODR nhảy về 0% hoặc
 * 100%, lọt vào bảng xếp hạng thì gây hiểu nhầm.
 */
export function provinceRanking(
  scope: DataScope,
  campaign: string,
  direction: Direction,
  day: DayOffset,
  minOrders: number,
): ProvinceRow[] {
  return CAMPAIGN_PROVINCES.filter(
    (r) =>
      r.scope === scope &&
      r.campaign === campaign &&
      r.type === "CP" &&
      r.day === day &&
      r.direction === direction &&
      r.orders >= minOrders,
  )
    .map((r) => ({ province: r.province, ...cell(r.orders, r.ontime) }))
    .sort((a, b) => b.odr - a.odr);
}
