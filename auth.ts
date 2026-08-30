import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowed } from "@/lib/allowlist";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/dang-nhap",
    error: "/dang-nhap",
  },
  callbacks: {
    /**
     * Chặn ngay ở bước đăng nhập: email ngoài allowlist không tạo được session,
     * nên không có gì để rò rỉ ở các bước sau.
     */
    signIn({ profile }) {
      return isAllowed(profile?.email);
    },
    session({ session }) {
      return session;
    },
  },
});
