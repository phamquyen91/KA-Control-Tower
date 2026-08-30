import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { isAllowed } from "@/lib/allowlist";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Đăng nhập — GHN Control Tower",
};

export default async function SignInPage({
  searchParams,
}: PageProps<"/dang-nhap">) {
  const session = await auth();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;

  // Đã đăng nhập và có quyền thì không việc gì phải ở lại trang này.
  if (session?.user && isAllowed(session.user.email)) redirect("/");

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>GHN</div>
        <h1 className={styles.title}>Control Tower</h1>
        <p className={styles.sub}>Shopee Account · KA Scommerce</p>

        {error === "AccessDenied" ? (
          <p className={styles.error}>
            Tài khoản vừa dùng không nằm trong danh sách được cấp quyền. Liên hệ
            người quản trị Control Tower để được bổ sung.
          </p>
        ) : (
          <p className={styles.text}>
            Một số tab chứa số liệu kinh doanh nên chỉ mở cho tài khoản được cấp
            quyền. Đăng nhập bằng tài khoản Google công ty để tiếp tục.
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className={styles.btn}>
            Đăng nhập bằng Google
          </button>
        </form>

        <Link className={styles.back} href="/">
          Quay lại Control Tower
        </Link>
      </div>
    </main>
  );
}
