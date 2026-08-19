import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GHN Control Tower — Shopee Account",
  description:
    "Control Tower cho KA Scommerce — Shopee Account (SPE Express & SPE Bulky)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={lato.variable}>
      <body>{children}</body>
    </html>
  );
}
