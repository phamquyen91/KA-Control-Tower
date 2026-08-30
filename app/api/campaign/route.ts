import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canSignIn } from "@/lib/access";
import { buildCampaignPayload } from "@/lib/campaignViewModel";

/**
 * Cổng lấy số liệu tab Campaign Shopee.
 *
 * Chỉ cần qua cửa tầng 1 (@ghn.vn) — tab này không giới hạn hẹp như tab kinh
 * doanh. Nhưng vẫn phải là một route riêng có kiểm tra, không được để dữ liệu
 * nằm trong bundle: proxy chặn được trang chứ không chặn file tĩnh, ai có sẵn
 * URL của chunk vẫn tải được mà không cần đăng nhập.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "unauthenticated", message: "Cần đăng nhập để xem dữ liệu này." },
      { status: 401 },
    );
  }

  if (!canSignIn(session.user.email)) {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Control Tower chỉ mở cho tài khoản @ghn.vn.",
        email: session.user.email,
      },
      { status: 403 },
    );
  }

  return NextResponse.json(buildCampaignPayload(), {
    headers: { "Cache-Control": "no-store, private" },
  });
}
