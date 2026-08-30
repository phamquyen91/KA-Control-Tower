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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
