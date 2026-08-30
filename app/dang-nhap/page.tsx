import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { canSignIn } from "@/lib/access";
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
  if (session?.user && canSignIn(session.user.email)) redirect("/");

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>GHN</div>
        <h1 className={styles.title}>Control Tower</h1>
        <p className={styles.sub}>Shopee Account · KA Scommerce</p>

        {error === "AccessDenied" ? (
          <p className={styles.error}>
            Control Tower chỉ mở cho tài khoản Google có đuôi{" "}
            <b>@ghn.vn</b>. Tài khoản vừa dùng không thuộc domain này.
          </p>
        ) : error ? (
          // Không nuốt lỗi: nếu chỉ đá người dùng về đây kèm màn hình đăng nhập
          // trắng trơn thì không ai biết hỏng ở đâu — lỗi cấu hình trông y hệt
          // lỗi bấm nhầm.
          <p className={styles.error}>
            <b>Đăng nhập thất bại — mã lỗi: {error}</b>
            <br />
            {error === "Configuration" || error === "OAuthCallbackError" ? (
              <>
                Google từ chối bước đổi mã lấy token. Nguyên nhân hay gặp nhất là{" "}
                <code>AUTH_GOOGLE_SECRET</code> trên Vercel không khớp với client
                secret đang bật ở Google Cloud — thường xảy ra sau khi xoay secret
                mà chưa cập nhật đủ cả ba môi trường, hoặc chưa redeploy.
              </>
            ) : (
              "Thử lại; nếu vẫn lỗi, gửi mã lỗi trên cho người quản trị Control Tower."
            )}
          </p>
        ) : (
          <p className={styles.text}>
            Control Tower chỉ dành cho tài khoản Google <b>@ghn.vn</b>. Riêng
            tab Tình hình kinh doanh còn giới hạn thêm trong một danh sách hẹp
            hơn.
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
