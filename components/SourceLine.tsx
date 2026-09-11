"use client";

import type { DataSource } from "@/lib/sheetSource";

/**
 * Dòng ghi nguồn dùng chung cho các tab đọc sheet: nói rõ số đang xem là đọc
 * trực tiếp hay bản chụp, chốt tới ngày nào. Kiểu `DataSource` import từ module
 * server-only nhưng chỉ lấy type nên client vẫn build được.
 */
export function SourceLine({ source, tab }: { source: DataSource; tab: string }) {
  const fetched = source.fetchedAt
    ? new Date(source.fetchedAt).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : null;

  return (
    <>
      Nguồn: tower control raw · tab {tab} ·{" "}
      {source.kind === "live" ? (
        <>
          <b>đọc trực tiếp từ sheet</b>
          {fetched ? ` (lần đọc gần nhất ${fetched}, làm mới mỗi giờ)` : ""}
        </>
      ) : (
        <>
          <b>bản chụp ngày {source.snapshotAt}</b>
        </>
      )}
      . Số liệu chốt tới <b>{source.dataThrough}</b> — sheet chạy mỗi sáng cho
      số của ngày hôm trước.
    </>
  );
}

/** Cảnh báo khi đường đọc trực tiếp lỗi và app đang rơi về bản chụp. */
export function FallbackWarning({
  source,
  className,
}: {
  source: DataSource;
  className: string;
}) {
  if (!source.fallbackReason) return null;
  return (
    <p className={className}>
      <b>Đang xem bản chụp cũ:</b> không đọc được sheet trực tiếp (
      <code>{source.fallbackReason}</code>). Số liệu dừng ở{" "}
      {source.dataThrough}, có thể đã lệch so với sheet hiện tại.
    </p>
  );
}
