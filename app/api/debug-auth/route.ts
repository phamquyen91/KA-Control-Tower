import { NextResponse } from "next/server";

/**
 * Endpoint chẩn đoán tạm thời cho cấu hình OAuth.
 *
 * KHÔNG trả về giá trị secret. Chỉ trả về hình dạng của nó — có tồn tại không,
 * dài bao nhiêu, có đúng tiền tố Google không, có dính khoảng trắng thừa không.
 * Bấy nhiêu đủ để phân biệt "dán thiếu ký tự" với "dán nhầm secret của client
 * khác", mà không làm rò rỉ gì.
 *
 * XOÁ FILE NÀY sau khi đăng nhập chạy được.
 */
export async function GET() {
  const id = process.env.AUTH_GOOGLE_ID ?? "";
  const secret = process.env.AUTH_GOOGLE_SECRET ?? "";
  const authSecret = process.env.AUTH_SECRET ?? "";

  return NextResponse.json(
    {
      clientId: {
        set: id.length > 0,
        length: id.length,
        // Client ID vốn công khai nên in ra được, tiện đối chiếu với Google.
        value: id,
        hasWhitespace: id !== id.trim(),
        looksValid: id.endsWith(".apps.googleusercontent.com"),
      },
      clientSecret: {
        set: secret.length > 0,
        length: secret.length,
        // Secret của Google có dạng GOCSPX- + 28 ký tự => tổng 35.
        expectedLength: 35,
        lengthOk: secret.trim().length === 35,
        prefixOk: secret.trim().startsWith("GOCSPX-"),
        hasWhitespace: secret !== secret.trim(),
      },
      authSecret: {
        set: authSecret.length > 0,
        length: authSecret.length,
      },
      runtime: {
        vercelEnv: process.env.VERCEL_ENV ?? null,
        deploymentUrl: process.env.VERCEL_URL ?? null,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
