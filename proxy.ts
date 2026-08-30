// Next.js 16 đổi tên `middleware.ts` thành `proxy.ts`, hàm export cũng đổi
// theo. Xem node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
export { auth as proxy } from "@/auth";

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
