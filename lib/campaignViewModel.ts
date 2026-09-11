import "server-only";

import {
  getCampaignDataset,
  SETTLE_DAYS,
  TOTAL_PROVINCES,
  type CampaignDataset,
  type Direction,
} from "./campaignData";
import { BIZ_SOURCE_URL } from "./labels";
import type { DataSource } from "./sheetSource";
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
  source: DataSource;
  sourceUrl: string;
  /** Baseline trong nguồn là trung bình mỗi ngày — cột "gấp ngày thường" mới có nghĩa. */
  baselinePerDay: boolean;
  /** Tab OPR có dữ liệu hay không. */
  hasOpr: boolean;
  settleDays: number;
  topLimit: number;
  totalProvinces: number;
  scopes: Record<DataScope, CampaignScopePayload>;
}

function buildScope(ds: CampaignDataset, scope: DataScope): CampaignScopePayload {
  const topProvinces: Record<string, Record<Direction, ProvinceRow[]>> = {};

  for (const campaign of ds.campaigns) {
    topProvinces[campaign] = {
      from: topProvincesByVolume(ds, scope, campaign, "from", TOP_PROVINCE_LIMIT),
      to: topProvincesByVolume(ds, scope, campaign, "to", TOP_PROVINCE_LIMIT),
    };
  }

  return {
    rows: campaignRows(ds, scope),
    teams: teamRows(ds, scope),
    topProvinces,
  };
}

export async function buildCampaignPayload(): Promise<CampaignPayload> {
  const ds = await getCampaignDataset();
  return {
    campaigns: ds.campaigns,
    latestCampaign: latestCampaign(ds),
    source: ds.source,
    sourceUrl: BIZ_SOURCE_URL,
    baselinePerDay: ds.baselinePerDay,
    hasOpr: ds.opr.length > 0,
    settleDays: SETTLE_DAYS,
    topLimit: TOP_PROVINCE_LIMIT,
    totalProvinces: TOTAL_PROVINCES,
    scopes: { SPB: buildScope(ds, "SPB"), SPE: buildScope(ds, "SPE") },
  };
}
