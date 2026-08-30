/**
 * Hai tầng phân quyền, đừng lẫn:
 *
 *  1. `canSignIn`  — ai được vào app. Chặn theo domain email: chỉ @ghn.vn.
 *  2. `canViewBiz` — ai được xem tab "Tình hình kinh doanh". Chặn theo danh
 *                    sách email cụ thể, hẹp hơn tầng 1.
 *
 * Tầng 2 luôn phải qua được tầng 1 trước. Viết lồng nhau như vậy để dù ai đó
 * lỡ thêm một email ngoài @ghn.vn vào danh sách tab kinh doanh thì cửa domain
 * vẫn chặn.
 *
 * So khớp không phân biệt hoa thường và bỏ khoảng trắng thừa, vì Google trả
 * email theo đúng cách người dùng đăng ký chứ không chuẩn hoá sẵn.
 */

/** Domain được phép đăng nhập vào app. Ghi đè bằng `SIGNIN_ALLOWED_DOMAINS`. */
const DEFAULT_SIGNIN_DOMAINS = ["ghn.vn"];

/** Email được xem tab kinh doanh. Ghi đè bằng `BIZ_ALLOWED_EMAILS`. */
const DEFAULT_BIZ_EMAILS = [
  "bachpt@ghn.vn",
  "tuyenvtn@ghn.vn",
  "vinhlt@ghn.vn",
  "thanhnh@ghn.vn",
  "quyenpt1@ghn.vn",
];

function parseEnvList(raw: string | undefined) {
  if (!raw) return null;
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : null;
}

const normalize = (email: string | null | undefined) =>
  email ? email.trim().toLowerCase() : null;

export function signInDomains(): string[] {
  return (
    parseEnvList(process.env.SIGNIN_ALLOWED_DOMAINS) ??
    DEFAULT_SIGNIN_DOMAINS.map((d) => d.toLowerCase())
  );
}

export function bizEmails(): string[] {
  return (
    parseEnvList(process.env.BIZ_ALLOWED_EMAILS) ??
    DEFAULT_BIZ_EMAILS.map((e) => e.toLowerCase())
  );
}

/** Tầng 1: có được vào app hay không. */
export function canSignIn(email: string | null | undefined): boolean {
  const normalized = normalize(email);
  if (!normalized) return false;
  // Cắt từ dấu @ cuối cùng: phần local của email hợp lệ vẫn có thể chứa "@".
  const at = normalized.lastIndexOf("@");
  if (at === -1) return false;
  const domain = normalized.slice(at + 1);
  return signInDomains().includes(domain);
}

/** Tầng 2: có được xem tab kinh doanh hay không. */
export function canViewBiz(email: string | null | undefined): boolean {
  const normalized = normalize(email);
  if (!normalized) return false;
  return canSignIn(normalized) && bizEmails().includes(normalized);
}
