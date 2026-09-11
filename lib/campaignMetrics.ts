import "server-only";

import {
  campaignDays,
  isSettled,
  type CampaignDataset,
  type DayOffset,
  type DeliveryTeam,
  type Direction,
} from "./campaignData";
import { dailyFcFor } from "./targetData";
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
  ds: CampaignDataset,
  scope: DataScope,
  campaign: string,
  type: "CP" | "baseline",
  day: DayOffset,
): OdrCell {
  const row = ds.totals.find(
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
  /**
   * Sản lượng ngày D gấp bao nhiêu lần ngày thường. Chỉ có khi baseline trong
   * nguồn là trung bình MỖI NGÀY; baseline gộp nhiều ngày thì null — chia ra
   * dưới 1 lần sẽ bị đọc thành campaign thấp hơn ngày thường.
   */
  liftVsBaseline: number | null;
  /** OPR ngày D (tỷ lệ lấy đúng hạn), gộp trọng số toàn scope; null khi tab OPR không có kỳ này. */
  oprD0: OdrCell | null;
  /** Mức hoàn thành so FC của từng ngày; null khi ngày đó không có trong file forecast. */
  fcD0: number | null;
  fcD1: number | null;
  /** Ngày D theo lịch; undefined khi nhãn kỳ không đọc ra ngày. */
  date: string | undefined;
  /** false = kỳ vừa diễn ra, đơn chưa giao xong, ODR/OPR chưa đáng tin. */
  settled: boolean;
}

function oprCell(
  ds: CampaignDataset,
  scope: DataScope,
  campaign: string,
  day: DayOffset,
  filter: (r: CampaignDataset["opr"][number]) => boolean = () => true,
): OdrCell | null {
  const rows = ds.opr.filter(
    (r) =>
      r.scope === scope &&
      r.campaign === campaign &&
      r.type === "CP" &&
      r.day === day &&
      filter(r),
  );
  if (rows.length === 0) return null;
  return cell(
    rows.reduce((a, r) => a + r.orders, 0),
    rows.reduce((a, r) => a + r.ontime, 0),
  );
}

export function campaignRows(ds: CampaignDataset, scope: DataScope): CampaignRow[] {
  return ds.campaigns.map((campaign) => {
    const cpD0 = lookup(ds, scope, campaign, "CP", "D0");
    const cpD1 = lookup(ds, scope, campaign, "CP", "D+1");
    const baselineD0 = lookup(ds, scope, campaign, "baseline", "D0");
    const days = campaignDays(ds, campaign);
    return {
      campaign,
      cpD0,
      cpD1,
      baselineD0,
      deltaD0Pp: (cpD0.odr - baselineD0.odr) * 100,
      liftVsBaseline:
        ds.baselinePerDay && baselineD0.orders > 0
          ? cpD0.orders / baselineD0.orders
          : null,
      oprD0: oprCell(ds, scope, campaign, "D0"),
      fcD0: completion(cpD0.orders, days && dailyFcFor(scope, days.d0)),
      fcD1: completion(cpD1.orders, days && dailyFcFor(scope, days.d1)),
      date: days?.d0,
      settled: isSettled(ds, campaign),
    };
  });
}

export function latestCampaign(ds: CampaignDataset): string {
  return ds.campaigns[ds.campaigns.length - 1] ?? "";
}

export interface TeamRow {
  campaign: string;
  cells: { team: DeliveryTeam; orders: number; share: number }[];
}

const TEAM_ORDER: DeliveryTeam[] = ["AHM", "GHN"];

/** Sản lượng ngày D theo đội giao, kèm tỷ trọng trong từng kỳ campaign. */
export function teamRows(ds: CampaignDataset, scope: DataScope): TeamRow[] {
  return ds.campaigns.map((campaign) => {
    const rows = ds.teams.filter(
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
  /** Bóc tách theo đội giao; tỉnh nào đội đó không chạy thì các số bằng 0. */
  byTeam: Record<DeliveryTeam, OdrCell>;
  /**
   * OPR (chiều lấy) từ tab `DD OPR` — chỉ có với direction "from". Mẫu của
   * tab OPR khác mẫu tab DD nên giữ riêng, không trộn vào orders/ontime ở trên.
   * null khi tab OPR không có tỉnh/đội đó.
   */
  opr: OdrCell | null;
  oprByTeam: Record<DeliveryTeam, OdrCell | null>;
}

/**
 * Top tỉnh theo SẢN LƯỢNG (không phải theo ODR).
 *
 * Xếp theo sản lượng thì không cần ngưỡng mẫu tối thiểu: tỉnh vài đơn tự khắc
 * rơi xuống cuối, không thể lọt top nhờ ODR 100% may mắn.
 */
export function topProvincesByVolume(
  ds: CampaignDataset,
  scope: DataScope,
  campaign: string,
  direction: Direction,
  limit: number,
): ProvinceRow[] {
  const rows = ds.provinces.filter(
    (r) =>
      r.scope === scope &&
      r.campaign === campaign &&
      r.type === "CP" &&
      r.day === "D0" &&
      r.direction === direction,
  );

  // Gộp các đội lại để xếp hạng, rồi mới bóc ngược ra từng đội. Xếp theo tổng
  // chứ không theo từng đội, nếu không hai bảng con sẽ có danh sách tỉnh khác
  // nhau và không đọc song song được.
  const byProvince = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byProvince.get(r.province) ?? [];
    list.push(r);
    byProvince.set(r.province, list);
  }

  return [...byProvince.entries()]
    .map(([province, list]) => {
      const orders = list.reduce((a, r) => a + r.orders, 0);
      const ontime = list.reduce((a, r) => a + r.ontime, 0);
      const teamCell = (team: DeliveryTeam) => {
        const picked = list.filter((r) => r.team === team);
        return cell(
          picked.reduce((a, r) => a + r.orders, 0),
          picked.reduce((a, r) => a + r.ontime, 0),
        );
      };
      const opr = (team?: DeliveryTeam) =>
        direction === "from"
          ? oprCell(
              ds,
              scope,
              campaign,
              "D0",
              (r) => r.province === province && (!team || r.team === team),
            )
          : null;
      return {
        province,
        ...cell(orders, ontime),
        byTeam: { AHM: teamCell("AHM"), GHN: teamCell("GHN") },
        opr: opr(),
        oprByTeam: { AHM: opr("AHM"), GHN: opr("GHN") },
      };
    })
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
}
