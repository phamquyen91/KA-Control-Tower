import "server-only";

import { BIZ_MONTHS } from "./bizData";
import { BIZ_SNAPSHOT_AT, BIZ_SOURCE_URL, WEIGHT_ORDER } from "./labels";
import {
  aopCompletion,
  bandShareByMonth,
  fcCompletion,
  laneShareByMonth,
  monthlyByBand,
  scopeProgress,
  teamShareByMonth,
} from "./bizMetrics";
import type { DataScope } from "./tabs";
import type { DeliveryTeam, Lane, WeightBand } from "./labels";

/**
 * Gói dữ liệu gửi ra cho giao diện. Chỉ chứa đúng những gì trang cần vẽ — số
 * liệu thô và bảng mục tiêu không rời khỏi server.
 */
export interface BizPayload {
  months: string[];
  snapshotAt: string;
  sourceUrl: string;
  scopes: Record<DataScope, ScopePayload>;
}

export interface ScopePayload {
  progress: {
    ytd: ProgressPayload;
    mtd: ProgressPayload;
    spark: number[];
  };
  /** Mỗi tháng: sản lượng theo band + tổng, kèm mức hoàn thành FC và AOP. */
  points: {
    month: string;
    bands: { band: WeightBand; created: number; gtc: number }[];
    created: number;
    gtc: number;
    fcTotal: number | null;
    aopTotal: number | null;
    fcByBand: Record<string, number | null>;
    aopByBand: Record<string, number | null>;
  }[];
  laneShare: {
    month: string;
    shares: { lane: Lane; share: number }[];
    totalCreated: number;
  }[];
  bandShare: {
    month: string;
    cells: { band: WeightBand; created: number; share: number }[];
  }[];
  teamShare: {
    month: string;
    cells: { team: DeliveryTeam; created: number; share: number }[];
  }[];
}

interface ProgressPayload {
  gtc: number;
  target: number;
  completion: number;
  periodLabel: string;
}

function buildScope(scope: DataScope): ScopePayload {
  const progress = scopeProgress(scope);

  return {
    progress: {
      ytd: progress.ytd,
      mtd: progress.mtd,
      spark: progress.spark,
    },
    points: monthlyByBand(scope).map((p) => ({
      month: p.month,
      bands: p.bands,
      created: p.created,
      gtc: p.gtc,
      fcTotal: fcCompletion(scope, p.month, p.created) ?? null,
      aopTotal: aopCompletion(scope, p.month, p.gtc) ?? null,
      fcByBand: Object.fromEntries(
        WEIGHT_ORDER.map((band) => {
          const cell = p.bands.find((b) => b.band === band);
          return [
            band,
            cell ? (fcCompletion(scope, p.month, cell.created, band) ?? null) : null,
          ];
        }),
      ),
      aopByBand: Object.fromEntries(
        WEIGHT_ORDER.map((band) => {
          const cell = p.bands.find((b) => b.band === band);
          return [
            band,
            cell ? (aopCompletion(scope, p.month, cell.gtc, band) ?? null) : null,
          ];
        }),
      ),
    })),
    laneShare: laneShareByMonth(scope),
    bandShare: bandShareByMonth(scope),
    teamShare: teamShareByMonth(scope),
  };
}

export function buildBizPayload(): BizPayload {
  return {
    months: BIZ_MONTHS,
    snapshotAt: BIZ_SNAPSHOT_AT,
    sourceUrl: BIZ_SOURCE_URL,
    scopes: {
      SPB: buildScope("SPB"),
      SPE: buildScope("SPE"),
    },
  };
}
