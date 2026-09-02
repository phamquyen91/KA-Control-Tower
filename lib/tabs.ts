export type TabId =
  | "biz"
  | "ops"
  | "khieunai"
  | "denbu"
  | "campaign"
  | "tms";

export type DataScope = "SPB" | "SPE";

/** Tên icon; định nghĩa hình ở components/NavIcon.tsx. */
export type IconName =
  | "biz"
  | "ops"
  | "care"
  | "complaint"
  | "refund"
  | "campaign"
  | "tasks";

export interface NavBlock {
  id: string;
  label: string;
  icon: IconName;
  tab?: TabId;
  children?: { tab: TabId; label: string; icon: IconName }[];
}

export const NAV_BLOCKS: NavBlock[] = [
  { id: "biz", label: "Tình hình kinh doanh", icon: "biz", tab: "biz" },
  { id: "ops", label: "Sức khoẻ vận hành", icon: "ops", tab: "ops" },
  {
    id: "cskh",
    label: "Khiếu nại & đền bù",
    icon: "care",
    children: [
      { tab: "khieunai", label: "Khiếu nại", icon: "complaint" },
      { tab: "denbu", label: "Đền bù", icon: "refund" },
    ],
  },
  {
    id: "campaign",
    label: "Campaign Shopee",
    icon: "campaign",
    tab: "campaign",
  },
  {
    id: "tms",
    label: "Quản trị công việc KA-SPE",
    icon: "tasks",
    tab: "tms",
  },
];

export const TAB_TITLES: Record<TabId, string> = {
  biz: "Tình hình kinh doanh",
  ops: "Sức khoẻ vận hành",
  khieunai: "Khiếu nại",
  denbu: "Đền bù",
  campaign: "Campaign Shopee",
  tms: "Quản trị công việc KA-SPE",
};
