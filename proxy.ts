import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canSignIn } from "@/lib/access";

// Next.js 16 đổi tên `middleware.ts` thành `proxy.ts`, hàm export cũng đổi theo.
// Xem node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md

/** Hai trang phải mở công khai, xem giải thích ở chỗ dùng bên dưới. */
const PUBLIC_PATHS = new Set(["/dang-nhap", "/privacy"]);

const KAS_ORIGIN =
  process.env.NEXT_PUBLIC_KAS_ORIGIN ??
  "https://kas-shopee-performance.vercel.app";

function buildCsp(nonce: string, isDev: boolean) {
  return [
    "default-src 'self'",
    // 'strict-dynamic' cho phép script đã được nonce duyệt tự nạp thêm chunk
    // của nó. Dev cần 'unsafe-eval' vì React dùng eval để dựng lại stack lỗi;
    // production thì không.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // 'unsafe-inline' ở đây là bắt buộc chứ không phải lười: giao diện có dùng
    // style inline (chiều rộng thanh tỷ trọng, vị trí tooltip). Nonce không áp
    // dụng được cho thuộc tính style="", chỉ cho thẻ <style>.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // next/font tự host font trong /_next/static nên không cần domain Google.
    "font-src 'self'",
    // Tab Sức khoẻ vận hành nhúng app báo cáo KAS.
    `frame-src ${KAS_ORIGIN}`,
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // Phải có accounts.google.com: form đăng nhập POST về chính mình rồi được
    // chuyển hướng sang Google, và trình duyệt kiểm tra cả đích sau chuyển
    // hướng. Thiếu dòng này là đăng nhập Google bị chặn.
    "form-action 'self' https://accounts.google.com",
    // App này không bao giờ được nhúng vào trang khác.
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;

  // /dang-nhap phải mở, chặn thì thành vòng lặp chuyển hướng.
  // /privacy phải mở vì Google trỏ link tới đây từ màn hình đồng ý, người chưa
  // đăng nhập vẫn phải đọc được.
  const isPublic = PUBLIC_PATHS.has(pathname);

  // Kiểm tra lại domain chứ không chỉ hỏi "có session không": danh sách domain
  // có thể bị thu hẹp sau khi ai đó đã đăng nhập, mà session cũ vẫn còn hiệu
  // lực cho tới khi hết hạn.
  if (!isPublic && !canSignIn(request.auth?.user?.email)) {
    const target = new URL("/dang-nhap", request.nextUrl.origin);
    target.searchParams.set("callbackUrl", request.nextUrl.href);
    return NextResponse.redirect(target);
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  // Đặt lên request để Next.js gắn nonce vào các script nội tuyến của nó.
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  /**
   * Chặn mọi đường dẫn trừ:
   *  - `api`      : để các route API tự trả mã lỗi đúng nghĩa. Nếu để proxy
   *                 chặn, fetch từ giao diện sẽ nhận HTML trang đăng nhập kèm
   *                 mã 200 thay vì 401, và chỗ gọi sẽ vỡ khi parse JSON.
   *  - tài nguyên tĩnh của Next và favicon.
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
