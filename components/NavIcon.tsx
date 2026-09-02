import styles from "./Sidebar.module.css";

/**
 * Icon cho từng mục ở mục lục.
 *
 * Vẽ bằng SVG nội tuyến, không dùng thư viện icon: CSP của app chỉ cho phép
 * tài nguyên từ chính domain, và thêm một dependency chỉ để lấy 6 hình là
 * không đáng. Nét dùng `currentColor` nên tự đổi màu theo trạng thái mục.
 */
export type IconName =
  | "biz"
  | "ops"
  | "care"
  | "complaint"
  | "refund"
  | "campaign"
  | "tasks";

const PATHS: Record<IconName, React.ReactNode> = {
  // Biểu đồ cột — tình hình kinh doanh
  biz: (
    <>
      <path d="M3 20h18" />
      <path d="M6.5 20v-6" />
      <path d="M12 20V5" />
      <path d="M17.5 20v-9" />
    </>
  ),
  // Nhịp tim — sức khoẻ vận hành
  ops: <path d="M2 12h4l2.5-7 4.5 14 2.5-7H22" />,
  // Vòng hỗ trợ — nhóm khiếu nại & đền bù
  care: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M14.5 9.5 18 6M9.5 9.5 6 6M9.5 14.5 6 18M14.5 14.5 18 18" />
    </>
  ),
  // Bong bóng thoại có dấu chấm than — khiếu nại
  complaint: (
    <>
      <path d="M20 15a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
      <path d="M12 8v3" />
      <path d="M12 13.5h.01" />
    </>
  ),
  // Tờ tiền — đền bù
  refund: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4M18 10v4" />
    </>
  ),
  // Loa phát thanh — campaign
  campaign: (
    <>
      <path d="M3 10.5v3a1.5 1.5 0 0 0 1.5 1.5H7l5 4V5L7 9H4.5A1.5 1.5 0 0 0 3 10.5z" />
      <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M19 7a7 7 0 0 1 0 10" />
    </>
  ),
  // Bảng công việc có dấu tích — quản trị công việc
  tasks: (
    <>
      <path d="M8 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <rect x="8.5" y="2.5" width="7" height="4" rx="1" />
      <path d="M8.5 13l2.5 2.5 5-5" />
    </>
  ),
};

export default function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
