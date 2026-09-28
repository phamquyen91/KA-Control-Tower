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

// HAI MẪU KHÁC NHAU, ĐỪNG TRỘN:
//  - tab `DD`     = sản lượng HẸN GIAO + ODR. Dùng cho bảng top tỉnh giao.
//                   KHÔNG phải sản lượng của ngày campaign, đừng đem so FC.
//  - tab `DD OPR` = sản lượng HẸN LẤY + OPR. Dùng cho biểu đồ sản lượng, bảng
//                   kỳ, bảng đội giao và bảng top tỉnh lấy. FC của Shopee là
//                   dự báo đơn lấy nên chỉ nguồn này mới so với FC được.
//
// Cả hai cùng tên cột `total_orders_in_sample`; parser tra THEO TÊN nên đổi
// thứ tự cột trong sheet không làm lệch số.
//
// Lấy nhầm sản lượng từ `DD` cho ra CP 8.8 Bulky 70k (34% FC, gấp 1,2 lần ngày
// thường); lấy đúng từ `DD OPR` ra 172k (83% FC, gấp 2,9 lần) — tức là khác
// nhau giữa "ngày campaign chẳng khác ngày thường" và một ngày cao điểm thật.

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

/**
 * Gộp tab `DD OPR`: trả về sản lượng hẹn lấy và tỷ lệ lấy đúng hạn.
 * null khi kỳ/ngày đó không có dòng nào — để giao diện bỏ trống, không ra 0.
 */
function oprCell(
  ds: CampaignDataset,
  scope: DataScope,
  campaign: string,
  type: "CP" | "baseline",
  day: DayOffset,
  filter: (r: CampaignDataset["opr"][number]) => boolean = () => true,
): OdrCell | null {
  const rows = ds.opr.filter(
    (r) =>
      r.scope === scope &&
      r.campaign === campaign &&
      r.type === type &&
      r.day === day &&
      filter(r),
  );
  if (rows.length === 0) return null;
  return cell(
    rows.reduce((a, r) => a + r.orders, 0),
    rows.reduce((a, r) => a + r.ontime, 0),
  );
}

export interface CampaignRow {
  campaign: string;
  /**
   * Sản lượng hẹn lấy (tab `DD OPR`) — đây mới là "sản lượng" của kỳ, và là
   * thứ duy nhất cùng phạm vi với FC.
   */
  volumeD0: number;
  volumeD1: number;
  /** Sản lượng hẹn lấy trung bình một ngày thường. */
  baselineVolumeD0: number;
  /** Mẫu GIAO (tab `DD`) — chỉ dùng lấy ODR, đừng đọc `orders` như sản lượng. */
  cpD0: OdrCell;
  cpD1: OdrCell;
  /** Ngày thường, chỉ tồn tại ở D0 — nên chỉ so được với cpD0. */
  baselineD0: OdrCell;
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

export function campaignRows(ds: CampaignDataset, scope: DataScope): CampaignRow[] {
  return ds.campaigns.map((campaign) => {
    const cpD0 = lookup(ds, scope, campaign, "CP", "D0");
    const cpD1 = lookup(ds, scope, campaign, "CP", "D+1");
    const baselineD0 = lookup(ds, scope, campaign, "baseline", "D0");
    const pickD0 = oprCell(ds, scope, campaign, "CP", "D0");
    const pickD1 = oprCell(ds, scope, campaign, "CP", "D+1");
    const pickBase = oprCell(ds, scope, campaign, "baseline", "D0");
    const volumeD0 = pickD0?.orders ?? 0;
    const volumeD1 = pickD1?.orders ?? 0;
    const baselineVolumeD0 = pickBase?.orders ?? 0;
    const days = campaignDays(ds, campaign);
    return {
      campaign,
      volumeD0,
      volumeD1,
      baselineVolumeD0,
      cpD0,
      cpD1,
      baselineD0,
      liftVsBaseline:
        ds.baselinePerDay && baselineVolumeD0 > 0
          ? volumeD0 / baselineVolumeD0
          : null,
      oprD0: pickD0,
      fcD0: completion(volumeD0, days && dailyFcFor(scope, days.d0)),
      fcD1: completion(volumeD1, days && dailyFcFor(scope, days.d1)),
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
    // Cùng nguồn với cột sản lượng trên biểu đồ (mẫu hẹn lấy), nếu không hai
    // chỗ cùng gọi là "sản lượng" lại ra hai con số khác nhau.
    const cells = TEAM_ORDER.map((team) => ({
      team,
      orders:
        oprCell(ds, scope, campaign, "CP", "D0", (r) => r.team === team)
          ?.orders ?? 0,
    }));
    const total = cells.reduce((a, c) => a + c.orders, 0);
    return {
      campaign,
      cells: cells.map((c) => ({
        ...c,
        share: total === 0 ? 0 : c.orders / total,
      })),
    };
  });
}

export interface ProvinceCell {
  orders: number;
  /** ODR (chiều giao) hoặc OPR (chiều lấy); null khi đội đó không chạy tỉnh này. */
  rate: number | null;
}

export interface ProvinceRow extends ProvinceCell {
  province: string;
  byTeam: Record<DeliveryTeam, ProvinceCell>;
}

/**
 * Top tỉnh theo SẢN LƯỢNG (không phải theo tỷ lệ).
 *
 * Xếp theo sản lượng thì không cần ngưỡng mẫu tối thiểu: tỉnh vài đơn tự khắc
 * rơi xuống cuối, không thể lọt top nhờ tỷ lệ 100% may mắn.
 *
 * NGUỒN THEO CHIỀU — hai chiều đo hai đại lượng khác nhau nên lấy hai tab
 * khác nhau, cùng đọc cột `total_orders_in_sample` của tab tương ứng:
 *  - "from" (tỉnh lấy)  → tab `DD OPR`: sản lượng HẸN LẤY + OPR
 *  - "to"   (tỉnh giao) → tab `DD`:     sản lượng HẸN GIAO + ODR
 *
 * Tổng hai bảng không bằng nhau, và đó là đúng — chúng đếm hai việc khác nhau.
 */
export function topProvincesByVolume(
  ds: CampaignDataset,
  scope: DataScope,
  campaign: string,
  direction: Direction,
  limit: number,
): ProvinceRow[] {
  const toCell = (orders: number, ontime: number): ProvinceCell => ({
    orders,
    // Tỉnh đội đó không chạy thì để trống, không hiện 0% — dễ đọc nhầm thành
    // trễ toàn bộ.
    rate: orders === 0 ? null : ontime / orders,
  });

  const groups = new Map<string, { orders: number; ontime: number; team: DeliveryTeam }[]>();
  const push = (province: string, team: DeliveryTeam, orders: number, ontime: number) => {
    const list = groups.get(province) ?? [];
    list.push({ orders, ontime, team });
    groups.set(province, list);
  };

  if (direction === "from") {
    for (const r of ds.opr) {
      if (r.scope === scope && r.campaign === campaign && r.type === "CP" && r.day === "D0") {
        push(r.province, r.team, r.orders, r.ontime);
      }
    }
  } else {
    for (const r of ds.provinces) {
      if (
        r.scope === scope &&
        r.campaign === campaign &&
        r.type === "CP" &&
        r.day === "D0" &&
        r.direction === "to"
      ) {
        push(r.province, r.team, r.orders, r.ontime);
      }
    }
  }

  return [...groups.entries()]
    .map(([province, list]) => {
      const teamCell = (team: DeliveryTeam) => {
        const picked = list.filter((r) => r.team === team);
        return toCell(
          picked.reduce((a, r) => a + r.orders, 0),
          picked.reduce((a, r) => a + r.ontime, 0),
        );
      };
      return {
        province,
        // Xếp hạng theo TỔNG rồi mới bóc ra từng đội, nếu không hai bảng con sẽ
        // có danh sách tỉnh khác nhau và không đọc song song được.
        ...toCell(
          list.reduce((a, r) => a + r.orders, 0),
          list.reduce((a, r) => a + r.ontime, 0),
        ),
        byTeam: { AHM: teamCell("AHM"), GHN: teamCell("GHN") },
      };
    })
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
}
