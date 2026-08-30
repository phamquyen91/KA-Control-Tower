import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Chính sách quyền riêng tư — GHN Control Tower",
  description:
    "App nội bộ GHN Control Tower dùng đăng nhập Google để xác định quyền xem báo cáo.",
};

/**
 * Trang chính sách quyền riêng tư.
 *
 * Google bắt khai link này ở màn hình OAuth consent trước khi cho publish app.
 * Nội dung mô tả đúng những gì app thực sự làm — app chỉ đọc email để đối chiếu
 * allowlist, không lưu và không chia sẻ đi đâu.
 */
export default function PrivacyPage() {
  return (
    <main className={styles.wrap}>
      <article className={styles.card}>
        <p className={styles.kicker}>GHN Control Tower</p>
        <h1 className={styles.title}>Chính sách quyền riêng tư</h1>
        <p className={styles.meta}>Cập nhật: 30/08/2026</p>

        <h2>1. Phạm vi</h2>
        <p>
          GHN Control Tower là công cụ báo cáo <b>nội bộ</b> của team KA
          Scommerce, chỉ dành cho nhân sự được cấp quyền. App không mở cho người
          dùng bên ngoài và không phục vụ mục đích thương mại.
        </p>

        <h2>2. Dữ liệu thu thập</h2>
        <p>
          App dùng đăng nhập Google và chỉ yêu cầu ba phạm vi cơ bản:{" "}
          <code>openid</code>, <code>email</code>, <code>profile</code>. Từ đó
          app đọc:
        </p>
        <ul>
          <li>
            <b>Địa chỉ email</b> — dùng duy nhất để đối chiếu với danh sách tài
            khoản được cấp quyền xem báo cáo.
          </li>
          <li>
            <b>Tên và ảnh đại diện</b> — hiển thị trong phiên đăng nhập.
          </li>
        </ul>
        <p>
          App <b>không</b> yêu cầu quyền truy cập Gmail, Google Drive, Danh bạ,
          Lịch hay bất kỳ dịch vụ Google nào khác.
        </p>

        <h2>3. Cách sử dụng và lưu trữ</h2>
        <p>
          Email chỉ được dùng tại thời điểm đăng nhập để quyết định cho phép hay
          từ chối truy cập. App <b>không</b> ghi thông tin này vào cơ sở dữ liệu
          nào. Phiên đăng nhập lưu trong cookie đã mã hoá trên trình duyệt của
          chính người dùng và hết hạn theo phiên.
        </p>

        <h2>4. Chia sẻ với bên thứ ba</h2>
        <p>
          Không. App không bán, không trao đổi và không chuyển dữ liệu người dùng
          cho bất kỳ bên thứ ba nào. Dữ liệu chỉ đi qua hạ tầng vận hành app
          (Vercel) và dịch vụ đăng nhập của Google.
        </p>

        <h2>5. Thu hồi quyền</h2>
        <p>
          Người dùng có thể thu hồi quyền truy cập của app bất cứ lúc nào tại{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Account · Third-party access
          </a>
          . Việc thu hồi có hiệu lực ngay và không ảnh hưởng tới dữ liệu nào
          khác.
        </p>

        <h2>6. Liên hệ</h2>
        <p>
          Thắc mắc về chính sách này, liên hệ quản trị Control Tower qua email{" "}
          <a href="mailto:quyenpt@ahamove.com">quyenpt@ahamove.com</a>.
        </p>

        <Link className={styles.back} href="/">
          ← Quay lại Control Tower
        </Link>
      </article>
    </main>
  );
}
