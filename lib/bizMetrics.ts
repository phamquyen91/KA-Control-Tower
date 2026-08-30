import "server-only";

import { BIZ_MONTHS, BIZ_ROWS, type BizRow } from "./bizData";
import {
  LANE_ORDER,
  WEIGHT_ORDER,
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

/** GTTC luỹ kế và GTTC tháng hiện tại, kèm mức hoàn thành so AOP cùng kỳ. */
export function scopeProgress(scope: DataScope): ScopeProgress {
  const series = monthlySeries(scope);
  const latest = series[series.length - 1];

  const ytdGtc = series.reduce((acc, p) => acc + p.gtc, 0);
  const ytdTarget = series.reduce(
    (acc, p) => acc + (aopFor(scope, p.month) ?? 0),
    0,
  );
  const mtdTarget = aopFor(scope, latest.month) ?? 0;

  const first = formatMonthShort(series[0].month);
  const last = formatMonthShort(latest.month);

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
      periodLabel: `${formatMonth(latest.month)}`,
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
