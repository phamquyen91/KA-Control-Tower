import { headers } from "next/headers";
import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

// Lato không có glyph tiếng Việt (next/font chỉ cho subset latin / latin-ext),
// nên mọi ký tự có dấu đều rơi sang font hệ thống — chữ trong cùng một từ đậm
// nhạt không đều. Be Vietnam Pro làm riêng cho tiếng Việt nên dựng dấu chuẩn ở
// mọi độ đậm.
const sans = Be_Vietnam_Pro({
  variable: "--font-sans",
  weight: ["400", "600", "700", "900"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GHN Control Tower — Shopee Account",
  description:
    "Control Tower cho KA Scommerce — Shopee Account (Shopee Standard & Shopee Bulky)",
  // App nội bộ, không có gì nên nằm trên công cụ tìm kiếm. Header X-Robots-Tag
  // trong next.config.ts mới là lớp phủ chính; thẻ meta này để phòng thêm.
  robots: { index: false, follow: false, nocache: true },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Buộc mọi trang render động.
  //
  // CSP trong proxy.ts dùng nonce sinh mới theo từng request, kèm
  // 'strict-dynamic' — mà 'strict-dynamic' vô hiệu hoá 'self', nên chỉ script
  // mang đúng nonce mới chạy. Trang prerender tĩnh thì HTML đã cố định từ lúc
  // build, không thể mang nonce của request, nên toàn bộ script bị chặn và
  // React không hydrate. Triệu chứng: trang hiện ra nhưng chết cứng, không gọi
  // được API nào.
  //
  // Next 16 đã bỏ `export const dynamic` khỏi route segment config, nên đọc
  // một API động là cách còn lại để opt-in. App vốn nằm sau đăng nhập nên
  // prerender tĩnh cũng không mang lại lợi ích gì.
  await headers();

  return (
    <html lang="vi" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
