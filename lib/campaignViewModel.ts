import "server-only";

import {
  CAMPAIGNS,
  CAMPAIGN_SNAPSHOT_AT,
  TOTAL_PROVINCES,
  type Direction,
} from "./campaignData";
import { BIZ_SOURCE_URL } from "./labels";
import {
  campaignRows,
  latestCampaign,
  teamRows,
  topProvincesByVolume,
  type CampaignRow,
  type ProvinceRow,
  type TeamRow,
} from "./campaignMetrics";
import type { DataScope } from "./tabs";

/** Số tỉnh hiển thị trong hai bảng top. */
export const TOP_PROVINCE_LIMIT = 10;

export interface CampaignScopePayload {
  rows: CampaignRow[];
  /** Chỉ Bulky mới dùng; Standard gần như toàn bộ do GHN giao. */
  teams: TeamRow[];
  /** topProvinces[kỳ campaign][chiều] */
  topProvinces: Record<string, Record<Direction, ProvinceRow[]>>;
}

export interface CampaignPayload {
  campaigns: string[];
  latestCampaign: string;
  snapshotAt: string;
  sourceUrl: string;
  topLimit: number;
  totalProvinces: number;
  scopes: Record<DataScope, CampaignScopePayload>;
}

function buildScope(scope: DataScope): CampaignScopePayload {
  const topProvinces: Record<string, Record<Direction, ProvinceRow[]>> = {};

  for (const campaign of CAMPAIGNS) {
    topProvinces[campaign] = {
      from: topProvincesByVolume(scope, campaign, "from", TOP_PROVINCE_LIMIT),
      to: topProvincesByVolume(scope, campaign, "to", TOP_PROVINCE_LIMIT),
    };
  }

  return { rows: campaignRows(scope), teams: teamRows(scope), topProvinces };
}

export function buildCampaignPayload(): CampaignPayload {
  return {
    campaigns: CAMPAIGNS,
    latestCampaign: latestCampaign(),
    snapshotAt: CAMPAIGN_SNAPSHOT_AT,
    sourceUrl: BIZ_SOURCE_URL,
    topLimit: TOP_PROVINCE_LIMIT,
    totalProvinces: TOTAL_PROVINCES,
    scopes: { SPB: buildScope("SPB"), SPE: buildScope("SPE") },
  };
}
