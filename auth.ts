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

    session({ session }) {
      return session;
    },
  },
});
