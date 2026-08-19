import type { TabId } from "./tabs";

export const PLACEHOLDERS: Record<
  Exclude<TabId, "ops">,
  { description: string; planned: string[] }
> = {
  biz: {
    description:
      "Tổng quan sản lượng SPE Express & SPE Bulky: Create/GTTC theo tháng, so sánh FC và AOP, cơ cấu theo loại lane và block weight.",
    planned: [
      "Biểu đồ sản lượng theo tháng — mỗi tháng 2 cột Create và GTTC, chồng Express + Bulky",
      "Metric MTD: Created, GTTC, % hoàn thành FC, MoM cùng ngày, % GTTC so AOP",
      "Bảng tỷ trọng theo loại lane (Intra City / Intra Region / Cross Region / Cross Metro)",
      "Riêng Bulky: sản lượng theo 3 nhóm vận hành (Ahamove / Vùng / GXT) và theo block weight",
    ],
  },
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
      "Tổng quan giá trị đền bù theo tuần cho SPE Express và Shopee Bulky",
      "Bảng phân tích theo loại đền bù × nhóm khách hàng (SPB / SPE / Reverse)",
      "FC miễn cước Pickup & Delivery, phân tích đền bù theo ngành hàng",
    ],
  },
  campaign: {
    description:
      "Kết quả các campaign Double Day: sản lượng ngày D và D+1, KPI Pickup/Delivery, so sánh với FC và ngày thường.",
    planned: [
      "Record Double Day theo từng kỳ campaign, tách Bulky / Express",
      "Biểu đồ cột chồng sản lượng ngày D và D+1",
      "Bảng KPI campaign: % Pickup, % Delivery, tỷ lệ fail, mức tăng so ngày thường",
      "Top 5 tỉnh theo Pickup và theo Delivery cho từng kỳ campaign",
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
