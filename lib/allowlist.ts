/**
 * Danh sách email được xem tab "Tình hình kinh doanh".
 *
 * Sửa trực tiếp ở đây rồi deploy lại là danh sách có hiệu lực ngay. Có thể ghi
 * đè bằng biến môi trường `BIZ_ALLOWED_EMAILS` (các email cách nhau bởi dấu
 * phẩy) nếu muốn đổi mà không cần sửa code.
 *
 * So khớp không phân biệt hoa thường và bỏ khoảng trắng thừa, vì Google trả
 * email theo đúng cách người dùng đăng ký chứ không chuẩn hoá sẵn.
 */
const DEFAULT_ALLOWED = [
  "bachpt@ghn.vn",
  "tuyenvtn@ghn.vn",
  "vinhlt@ghn.vn",
  "thanhnh@ghn.vn",
  "quyenpt@ahamove.com",
];

function parseEnvList(raw: string | undefined) {
  if (!raw) return null;
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : null;
}

export function allowedEmails(): string[] {
  return (
    parseEnvList(process.env.BIZ_ALLOWED_EMAILS) ??
    DEFAULT_ALLOWED.map((e) => e.toLowerCase())
  );
}

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedEmails().includes(email.trim().toLowerCase());
}
