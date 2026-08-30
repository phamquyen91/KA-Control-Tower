import {
  BIZ_MONTHS,
  BIZ_ROWS,
  LANE_ORDER,
  WEIGHT_ORDER,
  type BizRow,
  type Lane,
  type WeightBand,
} from "./bizData";
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

const NUMBER = new Intl.NumberFormat("vi-VN");

export function formatNumber(value: number) {
  return NUMBER.format(Math.round(value));
}

/** Rút gọn cho trục biểu đồ: 1.234.567 -> "1,2tr". */
export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return NUMBER.format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits).replace(".", ",")}%`;
}

export function formatSignedPercent(value: number | null, digits = 1) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits).replace(".", ",")}%`;
}

/** "2026-08" -> "T8/2026" */
export function formatMonth(month: string) {
  const [year, m] = month.split("-");
  return `T${Number(m)}/${year}`;
}

/** "2026-08" -> "T8" — dùng cho nhãn trục X cho gọn. */
export function formatMonthShort(month: string) {
  return `T${Number(month.split("-")[1])}`;
}
