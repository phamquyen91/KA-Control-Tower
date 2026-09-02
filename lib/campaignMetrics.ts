import "server-only";

import {
  CAMPAIGNS,
  CAMPAIGN_PROVINCES,
  CAMPAIGN_TEAMS,
  CAMPAIGN_TOTALS,
  type DayOffset,
  type DeliveryTeam,
  type Direction,
} from "./campaignData";
import { campaignFcFor } from "./targetData";
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

/** Tỷ lệ hoàn thành; null khi không có mục tiêu để so, để giao diện bỏ trống. */
function completion(actual: number, target: number | undefined) {
  return target === undefined || target === 0 ? null : actual / target;
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
  /** Sản lượng ngày D gấp bao nhiêu lần ngày thường; null khi không có baseline. */
  liftVsBaseline: number | null;
  /** Mức hoàn thành so FC của từng ngày; null khi kỳ đó chưa có file forecast. */
  fcD0: number | null;
  fcD1: number | null;
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
      liftVsBaseline:
        baselineD0.orders === 0 ? null : cpD0.orders / baselineD0.orders,
      fcD0: completion(cpD0.orders, campaignFcFor(scope, campaign, "D0")),
      fcD1: completion(cpD1.orders, campaignFcFor(scope, campaign, "D+1")),
    };
  });
}

export function latestCampaign(): string {
  return CAMPAIGNS[CAMPAIGNS.length - 1];
}

export interface TeamRow {
  campaign: string;
  cells: { team: DeliveryTeam; orders: number; share: number }[];
}

const TEAM_ORDER: DeliveryTeam[] = ["AHM", "GHN"];

/** Sản lượng ngày D theo đội giao, kèm tỷ trọng trong từng kỳ campaign. */
export function teamRows(scope: DataScope): TeamRow[] {
  return CAMPAIGNS.map((campaign) => {
    const rows = CAMPAIGN_TEAMS.filter(
      (r) =>
        r.scope === scope &&
        r.campaign === campaign &&
        r.type === "CP" &&
        r.day === "D0",
    );
    const total = rows.reduce((acc, r) => acc + r.orders, 0);
    return {
      campaign,
      cells: TEAM_ORDER.map((team) => {
        const orders = rows
          .filter((r) => r.team === team)
          .reduce((acc, r) => acc + r.orders, 0);
        return { team, orders, share: total === 0 ? 0 : orders / total };
      }),
    };
  });
}

export interface ProvinceRow extends OdrCell {
  province: string;
}

/**
 * Top tỉnh theo SẢN LƯỢNG (không phải theo ODR).
 *
 * Xếp theo sản lượng thì không cần ngưỡng mẫu tối thiểu: tỉnh vài đơn tự khắc
 * rơi xuống cuối, không thể lọt top nhờ ODR 100% may mắn.
 */
export function topProvincesByVolume(
  scope: DataScope,
  campaign: string,
  direction: Direction,
  limit: number,
): ProvinceRow[] {
  return CAMPAIGN_PROVINCES.filter(
    (r) =>
      r.scope === scope &&
      r.campaign === campaign &&
      r.type === "CP" &&
      r.day === "D0" &&
      r.direction === direction,
  )
    .map((r) => ({ province: r.province, ...cell(r.orders, r.ontime) }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
}
