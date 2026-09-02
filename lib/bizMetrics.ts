import "server-only";

import { BIZ_MONTHS, BIZ_ROWS, type BizRow } from "./bizData";
import {
  LANE_ORDER,
  TEAM_ORDER,
  WEIGHT_ORDER,
  type DeliveryTeam,
  type Lane,
  type WeightBand,
} from "./labels";
import { aopFor, fcFor } from "./targetData";
import { formatMonth, formatMonthShort } from "./format";
import type { DataScope } from "./tabs";

export interface MonthPoint {
  month: string;
  created: number;
  gtc: number;
}

export interface BreakdownRow<T extends string> {
  key: T;
  created: number;
  gtc: number;
  /** GTTC / Created của chính dòng này. */
  gtcRate: number;
  /** Tỷ trọng created của dòng này trên tổng tháng. */
  share: number;
  /** Biến động created so tháng liền trước; null khi không có tháng trước. */
  momCreated: number | null;
}

function sum(rows: BizRow[], field: "created" | "gtc") {
  return rows.reduce((acc, r) => acc + r[field], 0);
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator;
}

/** Chuỗi sản lượng theo tháng của một scope, tăng dần theo thời gian. */
export function monthlySeries(scope: DataScope): MonthPoint[] {
  return BIZ_MONTHS.map((month) => {
    const rows = BIZ_ROWS.filter((r) => r.scope === scope && r.month === month);
    return { month, created: sum(rows, "created"), gtc: sum(rows, "gtc") };
  });
}

function breakdown<T extends string>(
  scope: DataScope,
  month: string,
  prevMonth: string | undefined,
  keys: readonly T[],
  pick: (row: BizRow) => T,
): BreakdownRow<T>[] {
  const monthRows = BIZ_ROWS.filter(
    (r) => r.scope === scope && r.month === month,
  );
  const totalCreated = sum(monthRows, "created");

  return keys.map((key) => {
    const rows = monthRows.filter((r) => pick(r) === key);
    const created = sum(rows, "created");
    const gtc = sum(rows, "gtc");

    let momCreated: number | null = null;
    if (prevMonth) {
      const prevCreated = sum(
        BIZ_ROWS.filter(
          (r) =>
            r.scope === scope && r.month === prevMonth && pick(r) === key,
        ),
        "created",
      );
      momCreated = prevCreated === 0 ? null : created / prevCreated - 1;
    }

    return {
      key,
      created,
      gtc,
      gtcRate: ratio(gtc, created),
      share: ratio(created, totalCreated),
      momCreated,
    };
  });
}

export function laneBreakdown(
  scope: DataScope,
  month: string,
  prevMonth?: string,
): BreakdownRow<Lane>[] {
  return breakdown(scope, month, prevMonth, LANE_ORDER, (r) => r.lane);
}

export function weightBreakdown(
  scope: DataScope,
  month: string,
  prevMonth?: string,
): BreakdownRow<WeightBand>[] {
  return breakdown(scope, month, prevMonth, WEIGHT_ORDER, (r) => r.weight);
}

export interface BizSummary {
  month: string;
  prevMonth?: string;
  created: number;
  gtc: number;
  gtcRate: number;
  /** Biến động created so tháng liền trước. */
  momCreated: number | null;
  /** Tổng created toàn kỳ có trong dữ liệu. */
  ytdCreated: number;
}

export function bizSummary(scope: DataScope): BizSummary {
  const series = monthlySeries(scope);
  const latest = series[series.length - 1];
  const prev = series[series.length - 2];

  return {
    month: latest.month,
    prevMonth: prev?.month,
    created: latest.created,
    gtc: latest.gtc,
    gtcRate: ratio(latest.gtc, latest.created),
    momCreated: prev && prev.created > 0 ? latest.created / prev.created - 1 : null,
    ytdCreated: series.reduce((acc, p) => acc + p.created, 0),
  };
}

// ---------------------------------------------------------------------------
// Đối chiếu mục tiêu: FC cho Created, AOP cho GTTC.
// ---------------------------------------------------------------------------


export interface BandPoint {
  month: string;
  /** Sản lượng theo từng nhóm trọng lượng, đúng thứ tự WEIGHT_ORDER. */
  bands: { band: WeightBand; created: number; gtc: number }[];
  created: number;
  gtc: number;
}

export function monthlyByBand(scope: DataScope): BandPoint[] {
  return BIZ_MONTHS.map((month) => {
    const bands = WEIGHT_ORDER.map((band) => {
      const rows = BIZ_ROWS.filter(
        (r) => r.scope === scope && r.month === month && r.weight === band,
      );
      return { band, created: sum(rows, "created"), gtc: sum(rows, "gtc") };
    });
    return {
      month,
      bands,
      created: bands.reduce((a, b) => a + b.created, 0),
      gtc: bands.reduce((a, b) => a + b.gtc, 0),
    };
  });
}

/** Tỷ lệ hoàn thành; undefined khi tháng đó không có mục tiêu để so. */
function completion(actual: number, target: number | undefined) {
  return target === undefined || target === 0 ? undefined : actual / target;
}

export const fcCompletion = (
  scope: DataScope,
  month: string,
  created: number,
  band?: WeightBand,
) => completion(created, fcFor(scope, month, band));

export const aopCompletion = (
  scope: DataScope,
  month: string,
  gtc: number,
  band?: WeightBand,
) => completion(gtc, aopFor(scope, month, band));

export interface ProgressStat {
  gtc: number;
  target: number;
  completion: number;
  /** Nhãn kỳ, ví dụ "T1–T8/2026" hoặc "T8/2026". */
  periodLabel: string;
}

export interface ScopeProgress {
  ytd: ProgressStat;
  mtd: ProgressStat;
  /** Chuỗi GTTC theo tháng, dùng vẽ sparkline. */
  spark: number[];
}

/** Tháng theo lịch hiện tại, dạng "YYYY-MM". */
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * GTTC luỹ kế và GTTC tháng hiện tại, kèm mức hoàn thành so AOP cùng kỳ.
 *
 * YTD chỉ cộng các tháng ĐÃ ĐỦ. Tháng đang chạy bị loại vì nó luôn khuyết ngày
 * trong khi AOP của nó là mục tiêu trọn tháng — gộp vào sẽ kéo tỷ lệ hoàn thành
 * xuống một cách giả tạo, và mức bóp méo càng lớn khi tháng mới bắt đầu.
 * Tháng đang chạy được nhìn riêng ở ô MTD.
 */
export function scopeProgress(scope: DataScope): ScopeProgress {
  const series = monthlySeries(scope);
  const latest = series[series.length - 1];
  const running = currentMonth();
  const isPartial = latest.month === running;

  const complete = isPartial ? series.slice(0, -1) : series;
  const ytdSource = complete.length ? complete : series;

  const ytdGtc = ytdSource.reduce((acc, p) => acc + p.gtc, 0);
  const ytdTarget = ytdSource.reduce(
    (acc, p) => acc + (aopFor(scope, p.month) ?? 0),
    0,
  );
  const mtdTarget = aopFor(scope, latest.month) ?? 0;

  const first = formatMonthShort(ytdSource[0].month);
  const last = formatMonthShort(ytdSource[ytdSource.length - 1].month);

  return {
    ytd: {
      gtc: ytdGtc,
      target: ytdTarget,
      completion: ytdTarget === 0 ? 0 : ytdGtc / ytdTarget,
      periodLabel: `${first}–${last}/2026`,
    },
    mtd: {
      gtc: latest.gtc,
      target: mtdTarget,
      completion: mtdTarget === 0 ? 0 : latest.gtc / mtdTarget,
      periodLabel: isPartial
        ? `${formatMonth(latest.month)} · đang chạy`
        : formatMonth(latest.month),
    },
    spark: series.map((p) => p.gtc),
  };
}

export interface LaneShareRow {
  month: string;
  shares: { lane: Lane; share: number }[];
  totalCreated: number;
}

/** Bảng tỷ trọng lane theo tháng: 4 cột tỷ trọng + 1 cột tổng tuyệt đối. */
export function laneShareByMonth(scope: DataScope): LaneShareRow[] {
  return BIZ_MONTHS.map((month) => {
    const rows = BIZ_ROWS.filter((r) => r.scope === scope && r.month === month);
    const totalCreated = sum(rows, "created");
    return {
      month,
      totalCreated,
      shares: LANE_ORDER.map((lane) => ({
        lane,
        share: ratio(
          sum(
            rows.filter((r) => r.lane === lane),
            "created",
          ),
          totalCreated,
        ),
      })),
    };
  });
}

export interface BandShareRow {
  month: string;
  cells: { band: WeightBand; created: number; share: number }[];
}

/** Bảng sản lượng + tỷ trọng theo nhóm trọng lượng, mỗi hàng là một tháng. */
export function bandShareByMonth(scope: DataScope): BandShareRow[] {
  return monthlyByBand(scope).map((point) => ({
    month: point.month,
    cells: point.bands.map((b) => ({
      band: b.band,
      created: b.created,
      share: ratio(b.created, point.created),
    })),
  }));
}

export interface TeamShareRow {
  month: string;
  cells: { team: DeliveryTeam; created: number; share: number }[];
}

/**
 * Sản lượng và tỷ trọng theo đội giao, mỗi hàng một tháng.
 *
 * Cùng khuôn với bảng theo nhóm trọng lượng để đọc song song được: cột tuyệt
 * đối đứng cạnh cột tỷ trọng của chính đội đó.
 */
export function teamShareByMonth(scope: DataScope): TeamShareRow[] {
  return BIZ_MONTHS.map((month) => {
    const monthRows = BIZ_ROWS.filter(
      (r) => r.scope === scope && r.month === month,
    );
    const total = sum(monthRows, "created");
    return {
      month,
      cells: TEAM_ORDER.map((team) => {
        const created = sum(
          monthRows.filter((r) => r.team === team),
          "created",
        );
        return { team, created, share: ratio(created, total) };
      }),
    };
  });
}
