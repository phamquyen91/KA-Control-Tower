import "server-only";

import { CAMPAIGNS, CAMPAIGN_SNAPSHOT_AT, type Direction } from "./campaignData";
import { BIZ_SOURCE_URL } from "./labels";
import {
  campaignRows,
  latestCampaign,
  provinceRanking,
  type CampaignRow,
  type ProvinceRow,
} from "./campaignMetrics";
import type { DataScope } from "./tabs";

/**
 * Ngưỡng mẫu tối thiểu cho bảng xếp hạng tỉnh. Dưới mức này ODR nhảy về 0%
 * hoặc 100% chỉ vì vài đơn, lọt vào top thì gây hiểu nhầm.
 */
export const MIN_SAMPLE = 300;

const DIRECTIONS: Direction[] = ["to", "from"];

export interface RankingPayload {
  /** Số tỉnh đạt ngưỡng mẫu, để giao diện nói rõ đang xếp hạng trên bao nhiêu. */
  qualified: number;
  top: ProvinceRow[];
  bottom: ProvinceRow[];
}

export interface CampaignScopePayload {
  rows: CampaignRow[];
  /** rankings[kỳ campaign][chiều tỉnh] */
  rankings: Record<string, Record<Direction, RankingPayload>>;
}

export interface CampaignPayload {
  campaigns: string[];
  latestCampaign: string;
  snapshotAt: string;
  sourceUrl: string;
  minSample: number;
  totalProvinces: number;
  scopes: Record<DataScope, CampaignScopePayload>;
}

/**
 * Chỉ gửi ra đúng phần giao diện vẽ: 5 tỉnh đầu và 5 tỉnh cuối mỗi bảng, kèm
 * số tỉnh đạt ngưỡng. Ma trận tỉnh-đi × tỉnh-đến ở lại trên server.
 */
function buildScope(scope: DataScope): CampaignScopePayload {
  const rankings: Record<string, Record<Direction, RankingPayload>> = {};

  for (const campaign of CAMPAIGNS) {
    rankings[campaign] = {} as Record<Direction, RankingPayload>;
    for (const direction of DIRECTIONS) {
      const ranked = provinceRanking(
        scope,
        campaign,
        direction,
        "D0",
        MIN_SAMPLE,
      );
      rankings[campaign][direction] = {
        qualified: ranked.length,
        top: ranked.slice(0, 5),
        bottom: ranked.slice(-5).reverse(),
      };
    }
  }

  return { rows: campaignRows(scope), rankings };
}

export function buildCampaignPayload(): CampaignPayload {
  return {
    campaigns: CAMPAIGNS,
    latestCampaign: latestCampaign(),
    snapshotAt: CAMPAIGN_SNAPSHOT_AT,
    sourceUrl: BIZ_SOURCE_URL,
    minSample: MIN_SAMPLE,
    // Cố định 35 tỉnh trong dữ liệu nguồn; dùng cho dòng "x/35 tỉnh đủ điều kiện".
    totalProvinces: 35,
    scopes: { SPB: buildScope("SPB"), SPE: buildScope("SPE") },
  };
}
