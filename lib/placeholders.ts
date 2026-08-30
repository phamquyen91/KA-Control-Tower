import type { TabId } from "./tabs";

export const PLACEHOLDERS: Record<
  Exclude<TabId, "ops" | "biz" | "campaign">,
  { description: string; planned: string[] }
> = {
  khieunai: {
    description:
      "Theo dõi case khiếu nại & hỗ trợ theo tuần, case rate, phân loại case và top lý do phát sinh.",
    planned: [
      "Overview tuần báo cáo: tổng case, case rate, tỷ lệ Khiếu nại / Hỗ trợ",
      "Biểu đồ case & case rate 6 tuần gần nhất",
      "Bảng tỷ trọng theo phân loại case (tuyệt đối & tương đối)",
      "Top 5 lý do khiếu nại — nguồn KAC weekly report",
    ],
  },
  denbu: {
    description:
      "Giá trị đền bù theo tuần và theo tháng, bóc tách theo loại yêu cầu cho SPB / SPE / SPE Reverse, kèm FC miễn cước.",
    planned: [
      "Grand Total đền bù theo tháng và biến động MoM",
      "Tổng quan giá trị đền bù theo tuần cho Shopee Standard và Shopee Bulky",
      "Bảng phân tích theo loại đền bù × nhóm khách hàng (SPB / SPE / Reverse)",
      "FC miễn cước Pickup & Delivery, phân tích đền bù theo ngành hàng",
    ],
  },
  tms: {
    description:
      "Đồng bộ công việc của team KA-SPE từ hệ thống KATMS: task đang mở, quá hạn, đang xử lý và đã hoàn thành.",
    planned: [
      "Metric tổng quan: tổng task mở, quá hạn, đang xử lý, hoàn thành trong tuần",
      "Danh sách task kèm nhóm, người phụ trách, deadline và trạng thái",
      "Link trực tiếp sang KATMS cho từng task",
      "Đồng bộ realtime qua MCP KATMS",
    ],
  },
};
