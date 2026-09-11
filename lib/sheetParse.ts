import "server-only";

import type { DeliveryTeam, Lane, WeightBand } from "./labels";
import type { DataScope } from "./tabs";

// Bóc dòng thô của Google Sheet thành cấu trúc app dùng.
//
// ĐÂY LÀ ĐƯỜNG CODE DUY NHẤT biến sheet thành dữ liệu — bản đọc trực tiếp
// (Sheets API) lẫn bản chụp (lib/snapshot/*) đều đi qua đúng những hàm này.
// Nhờ vậy hai nguồn không bao giờ lệch nhau vì hai cách hiểu cột khác nhau.
//
// Mọi hàm nhận `unknown[][]` là ma trận ô đúng như sheet trả về, dòng đầu là
// tiêu đề. Tra cột THEO TÊN chứ không theo vị trí — sheet có thể thêm/bớt cột,
// và đã từng bỏ hẳn `delivery_team` khỏi tab `vol` mà không báo trước.

export type Cell = string | number | boolean | null | undefined;
export type SheetRows = Cell[][];

/* ------------------------------------------------------------------------ */
/* Tiện ích chung                                                            */
/* ------------------------------------------------------------------------ */

class Header {
  private index = new Map<string, number>();

  constructor(row: Cell[]) {
    row.forEach((cell, i) => {
      const key = String(cell ?? "").trim().toLowerCase();
      if (key) this.index.set(key, i);
    });
  }

  has(name: string) {
    return this.index.has(name.toLowerCase());
  }

  /** Vị trí cột; ném lỗi nếu thiếu — thiếu cột bắt buộc là lỗi nguồn, không được lặng lẽ ra 0. */
  col(name: string): number {
    const i = this.index.get(name.toLowerCase());
    if (i === undefined) throw new Error(`Sheet thiếu cột bắt buộc "${name}"`);
    return i;
  }
}

function text(cell: Cell): string {
  return String(cell ?? "").trim();
}

function num(cell: Cell): number {
  if (typeof cell === "number") return cell;
  const s = text(cell).replace(/[^\d.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Bỏ dòng trống hoàn toàn — sheet hay có đuôi trắng. */
function body(rows: SheetRows): { header: Header; data: Cell[][] } {
  const [head, ...rest] = rows;
  if (!head) throw new Error("Sheet không có dòng tiêu đề");
  return {
    header: new Header(head),
    data: rest.filter((r) => r.some((c) => text(c) !== "")),
  };
}

const SCOPE_BY_CLIENT: Record<string, DataScope> = {
  "shopee bulky": "SPB",
  "shopee express": "SPE",
  "shopee standard": "SPE",
};

function scopeOf(client: Cell): DataScope | undefined {
  return SCOPE_BY_CLIENT[text(client).toLowerCase()];
}

/* ------------------------------------------------------------------------ */
/* Tab `vol` — sản lượng tháng                                               */
/* ------------------------------------------------------------------------ */

export interface BizRow {
  /** "YYYY-MM" */
  month: string;
  scope: DataScope;
  lane: Lane;
  weight: WeightBand;
  /** null khi tab nguồn không có cột delivery_team. */
  team: DeliveryTeam | null;
  created: number;
  gtc: number;
}

const LANES: Lane[] = [
  "Intra city",
  "Intra region",
  "Cross region",
  "Cross metro",
  "Cross metro *",
];

function laneOf(cell: Cell): Lane {
  const s = text(cell);
  return LANES.find((l) => l.toLowerCase() === s.toLowerCase()) ?? "Không xác định";
}

function weightOf(cell: Cell): WeightBand | undefined {
  const s = text(cell).toLowerCase();
  if (s.includes("<15")) return "<15kg";
  if (s.includes(">=15") || s.includes("≥15")) return ">=15kg";
  return undefined;
}

function teamOf(cell: Cell): DeliveryTeam | null {
  const s = text(cell).toUpperCase();
  if (s === "AHM" || s === "GHN") return s;
  return null;
}

/** "2026-09-01" hoặc Date serial của Sheets → "2026-09". */
function monthOf(cell: Cell): string | undefined {
  if (typeof cell === "number") {
    // Sheets serial: số ngày kể từ 1899-12-30.
    const d = new Date(Date.UTC(1899, 11, 30) + cell * 86_400_000);
    return d.toISOString().slice(0, 7);
  }
  const m = /^(\d{4})-(\d{2})/.exec(text(cell));
  return m ? `${m[1]}-${m[2]}` : undefined;
}

export interface ParsedVol {
  rows: BizRow[];
  /** Tab có cột delivery_team hay không — quyết định bảng đội giao có nguồn. */
  hasTeam: boolean;
}

export function parseVol(rows: SheetRows): ParsedVol {
  const { header, data } = body(rows);
  const cTime = header.col("timeview");
  const cClient = header.col("clientname");
  const cLane = header.col("lane");
  const cWeight = header.col("weight_range");
  const cCreated = header.col("vol_created");
  const cGtc = header.col("vol_gtc");
  const hasTeam = header.has("delivery_team");
  const cTeam = hasTeam ? header.col("delivery_team") : -1;

  const out: BizRow[] = [];
  for (const r of data) {
    const month = monthOf(r[cTime]);
    const scope = scopeOf(r[cClient]);
    const weight = weightOf(r[cWeight]);
    // Dòng không xếp được vào scope/tháng/band nào thì bỏ — nhưng bỏ có chủ
    // đích, không âm thầm gán vào nhóm sai.
    if (!month || !scope || !weight) continue;
    out.push({
      month,
      scope,
      lane: laneOf(r[cLane]),
      weight,
      team: hasTeam ? teamOf(r[cTeam]) : null,
      created: num(r[cCreated]),
      gtc: num(r[cGtc]),
    });
  }
  return { rows: out, hasTeam };
}

/* ------------------------------------------------------------------------ */
/* Tab `DD` — ODR theo tỉnh đi × tỉnh đến × đội giao                          */
/* ------------------------------------------------------------------------ */

export type CampaignType = "CP" | "baseline";
export type DayOffset = "D0" | "D+1";
export type Direction = "from" | "to";

export interface CampaignTotal {
  campaign: string;
  type: CampaignType;
  day: DayOffset;
  scope: DataScope;
  orders: number;
  ontime: number;
}

export interface CampaignTeam extends CampaignTotal {
  team: DeliveryTeam;
}

export interface CampaignProvince extends CampaignTotal {
  /** "from" = tỉnh lấy hàng (pickup), "to" = tỉnh giao hàng (delivery). */
  direction: Direction;
  province: string;
  team: DeliveryTeam;
}

export interface CampaignAgg {
  totals: CampaignTotal[];
  teams: CampaignTeam[];
  provinces: CampaignProvince[];
  /**
   * Baseline trong nguồn là TRUNG BÌNH MỖI NGÀY (nhãn "D0 (avg 7d)") hay TỔNG
   * nhiều ngày. Chỉ khi là trung bình ngày thì mới chia sản lượng campaign cho
   * baseline ra "gấp bao nhiêu lần ngày thường" được.
   */
  baselinePerDay: boolean;
}

function typeOf(cell: Cell): CampaignType | undefined {
  const s = text(cell).toLowerCase();
  if (s === "cp") return "CP";
  if (s.startsWith("base")) return "baseline";
  return undefined;
}

/** "D0", "D+1", "D0 (avg 7d)" → offset + cờ baseline theo ngày. */
function dayOf(cell: Cell): { day: DayOffset; perDay: boolean } | undefined {
  const s = text(cell).toUpperCase().replace(/\s+/g, "");
  if (s.startsWith("D+1")) return { day: "D+1", perDay: false };
  if (s.startsWith("D0")) return { day: "D0", perDay: s.includes("AVG") };
  return undefined;
}

/** Gom dòng thô của tab DD thành ba mức: tổng, theo đội, theo tỉnh × đội. */
export function aggregateDd(rows: SheetRows): CampaignAgg {
  const { header, data } = body(rows);
  const cCamp = header.col("period_label");
  const cType = header.col("type");
  const cDay = header.col("day_offset");
  const cClient = header.col("clientname");
  const cFrom = header.col("fromprovince_new");
  const cTo = header.col("toprovince_new");
  const cTeam = header.col("delivery_team");
  const cOrders = header.col("total_orders_in_sample");
  const cOntime = header.col("ontime_deli_odr_count");

  const totals = new Map<string, CampaignTotal>();
  const teams = new Map<string, CampaignTeam>();
  const provinces = new Map<string, CampaignProvince>();
  let baselinePerDay = false;
  let sawBaseline = false;

  const bump = <T extends CampaignTotal>(
    map: Map<string, T>,
    key: string,
    make: () => T,
    orders: number,
    ontime: number,
  ) => {
    const cur = map.get(key) ?? make();
    cur.orders += orders;
    cur.ontime += ontime;
    map.set(key, cur);
  };

  for (const r of data) {
    const campaign = text(r[cCamp]);
    const type = typeOf(r[cType]);
    const dayInfo = dayOf(r[cDay]);
    const scope = scopeOf(r[cClient]);
    const team = teamOf(r[cTeam]);
    if (!campaign || !type || !dayInfo || !scope || !team) continue;

    if (type === "baseline") {
      sawBaseline = true;
      baselinePerDay ||= dayInfo.perDay;
    }
    const { day } = dayInfo;
    const orders = num(r[cOrders]);
    const ontime = num(r[cOntime]);
    const base = { campaign, type, day, scope, orders: 0, ontime: 0 };
    const k = `${campaign}|${type}|${day}|${scope}`;

    bump(totals, k, () => ({ ...base }), orders, ontime);
    bump(teams, `${k}|${team}`, () => ({ ...base, team }), orders, ontime);

    for (const direction of ["from", "to"] as const) {
      const province = text(direction === "from" ? r[cFrom] : r[cTo]);
      if (!province) continue;
      bump(
        provinces,
        `${k}|${direction}|${province}|${team}`,
        () => ({ ...base, direction, province, team }),
        orders,
        ontime,
      );
    }
  }

  return {
    totals: [...totals.values()],
    teams: [...teams.values()],
    provinces: [...provinces.values()],
    // Không có baseline nào thì cũng không được phép chia — coi như không theo ngày.
    baselinePerDay: sawBaseline && baselinePerDay,
  };
}

/* ------------------------------------------------------------------------ */
/* Tab `DD OPR` — OPR theo tỉnh lấy × đội                                    */
/* ------------------------------------------------------------------------ */

export interface OprRow {
  campaign: string;
  type: CampaignType;
  day: DayOffset;
  scope: DataScope;
  province: string;
  team: DeliveryTeam;
  orders: number;
  ontime: number;
}

export function parseOpr(rows: SheetRows): OprRow[] {
  const { header, data } = body(rows);
  const cCamp = header.col("period_label");
  const cType = header.col("type");
  const cDay = header.col("day_offset");
  const cClient = header.col("clientname");
  const cFrom = header.col("fromprovince_new");
  const cTeam = header.col("delivery_team");
  const cOrders = header.col("total_orders_in_sample");
  const cOntime = header.col("ontime_opr_count");

  const out: OprRow[] = [];
  for (const r of data) {
    const campaign = text(r[cCamp]);
    const type = typeOf(r[cType]);
    const dayInfo = dayOf(r[cDay]);
    const scope = scopeOf(r[cClient]);
    const team = teamOf(r[cTeam]);
    const province = text(r[cFrom]);
    if (!campaign || !type || !dayInfo || !scope || !team || !province) continue;
    out.push({
      campaign,
      type,
      day: dayInfo.day,
      scope,
      province,
      team,
      orders: num(r[cOrders]),
      ontime: num(r[cOntime]),
    });
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Kỳ campaign                                                               */
/* ------------------------------------------------------------------------ */

/**
 * "CP 9.9" → "2026-09-09". Nhãn campaign Shopee luôn là ngày.tháng trùng nhau
 * (6.6, 7.7, 9.9…); năm lấy theo năm dữ liệu.
 */
export function campaignDate(campaign: string, year: number): string | undefined {
  const m = /(\d{1,2})\.(\d{1,2})/.exec(campaign);
  if (!m) return undefined;
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Danh sách kỳ campaign trong dữ liệu, xếp theo ngày diễn ra. */
export function campaignList(totals: CampaignTotal[], year: number): string[] {
  const names = [...new Set(totals.filter((t) => t.type === "CP").map((t) => t.campaign))];
  return names.sort((a, b) =>
    (campaignDate(a, year) ?? a).localeCompare(campaignDate(b, year) ?? b),
  );
}
