import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canViewBiz } from "@/lib/access";
import { buildBizPayload } from "@/lib/bizViewModel";

/**
 * Cổng duy nhất để giao diện lấy số liệu tab Tình hình kinh doanh.
 *
 * Route này KHÔNG nằm sau proxy (matcher đã loại trừ /api) nên phải tự kiểm
 * tra, và trả đúng mã lỗi thay vì chuyển hướng — giao diện cần phân biệt
 * "chưa đăng nhập" với "đăng nhập rồi nhưng không đủ quyền".
 *
 * `canViewBiz` đã bao gồm cả cửa domain bên trong, nên nó chặt hơn cửa vào app.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "unauthenticated", message: "Cần đăng nhập để xem dữ liệu này." },
      { status: 401 },
    );
  }

  if (!canViewBiz(session.user.email)) {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Tài khoản này không nằm trong danh sách được cấp quyền.",
        email: session.user.email,
      },
      { status: 403 },
    );
  }

  return NextResponse.json(buildBizPayload(), {
    headers: {
      // Dữ liệu theo từng người dùng — không để CDN hay trình duyệt cache lại.
      "Cache-Control": "no-store, private",
    },
  });
}
