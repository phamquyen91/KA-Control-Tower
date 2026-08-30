import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAllowed } from "@/lib/allowlist";
import { buildBizPayload } from "@/lib/bizViewModel";

/**
 * Cổng duy nhất để giao diện lấy số liệu tab Tình hình kinh doanh.
 *
 * Kiểm tra hai lớp: có session hay không, và email có trong allowlist hay
 * không. Lớp thứ hai không thừa — allowlist có thể bị rút gọn sau khi ai đó
 * đã đăng nhập, và session cũ vẫn còn hiệu lực cho tới khi hết hạn.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "unauthenticated", message: "Cần đăng nhập để xem dữ liệu này." },
      { status: 401 },
    );
  }

  if (!isAllowed(session.user.email)) {
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
