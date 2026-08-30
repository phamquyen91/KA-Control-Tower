import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { canSignIn } from "@/lib/access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/dang-nhap",
    error: "/dang-nhap",
  },
  callbacks: {
    /**
     * Tầng 1, chặn ngay lúc đăng nhập: email ngoài domain cho phép không tạo
     * được session, nên không có gì để rò rỉ ở các bước sau.
     */
    signIn({ profile }) {
      return canSignIn(profile?.email);
    },

    /**
     * Chạy trong proxy.ts, quyết định request nào được đi tiếp.
     *
     * Kiểm tra lại domain chứ không chỉ hỏi "có session không": danh sách
     * domain có thể bị thu hẹp sau khi ai đó đã đăng nhập, mà session cũ thì
     * vẫn còn hiệu lực tới khi hết hạn.
     */
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;

      // Hai trang phải mở công khai: trang đăng nhập (nếu chặn thì thành vòng
      // lặp chuyển hướng) và trang chính sách quyền riêng tư (Google trỏ link
      // tới đây từ màn hình đồng ý, người chưa đăng nhập vẫn phải đọc được).
      if (pathname === "/dang-nhap" || pathname === "/privacy") return true;

      return canSignIn(session?.user?.email);
    },

    session({ session }) {
      return session;
    },
  },
});
