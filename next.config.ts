import type { NextConfig } from "next";

/**
 * Header bảo mật áp cho mọi phản hồi.
 *
 * Content-Security-Policy KHÔNG nằm ở đây mà ở `proxy.ts`, vì nó cần nonce
 * sinh mới theo từng request — thứ file cấu hình tĩnh không làm được.
 */
const SECURITY_HEADERS = [
  // Chặn trình duyệt tự đoán kiểu nội dung, cửa vào của nhiều đòn XSS.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // App này không bao giờ được nhúng vào trang khác. CSP frame-ancestors đã
  // lo phần chính; header này để phòng trình duyệt cũ không hiểu CSP.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Tắt hẳn các tính năng trình duyệt mà app không dùng.
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
  // Toàn bộ app là dữ liệu nội bộ, không có gì nên nằm trên công cụ tìm kiếm.
  // Đặt ở tầng header thì phủ được cả API và file tĩnh, chặt hơn thẻ meta.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  // Không quảng cáo framework đang dùng cho người quét lỗ hổng.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
