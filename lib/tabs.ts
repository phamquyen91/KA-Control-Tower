export type TabId =
  | "biz"
  | "ops"
  | "khieunai"
  | "denbu"
  | "campaign"
  | "tms";

export type DataScope = "SPB" | "SPE";
export type DataPeriod = "day" | "month";

export interface NavBlock {
  id: string;
  label: string;
  tab?: TabId;
  children?: { tab: TabId; label: string }[];
}

export const NAV_BLOCKS: NavBlock[] = [
  { id: "biz", label: "Tình hình kinh doanh", tab: "biz" },
  { id: "ops", label: "Sức khoẻ vận hành", tab: "ops" },
  {
    id: "cskh",
    label: "Khiếu nại & đền bù",
    children: [
      { tab: "khieunai", label: "Khiếu nại" },
      { tab: "denbu", label: "Đền bù" },
    ],
  },
  { id: "campaign", label: "Campaign Shopee", tab: "campaign" },
  { id: "tms", label: "Quản trị công việc KA-SPE", tab: "tms" },
];

export const TAB_TITLES: Record<TabId, string> = {
  biz: "Tình hình kinh doanh",
  ops: "Sức khoẻ vận hành",
  khieunai: "Khiếu nại",
  denbu: "Đền bù",
  campaign: "Campaign Shopee",
  tms: "Quản trị công việc KA-SPE",
};
