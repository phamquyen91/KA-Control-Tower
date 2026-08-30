"use client";

import { useEffect, useRef, useState } from "react";
// ^4.4.5 (MIT) — cùng bản với app nguồn. KHÔNG dùng v5+ (GPL-3.0/thương mại).
import { iframeResizer, type IFrameComponent } from "iframe-resizer";
import type { DataScope } from "@/lib/tabs";
import styles from "./OpsHealthIframe.module.css";

const KAS_ORIGIN =
  process.env.NEXT_PUBLIC_KAS_ORIGIN ??
  "https://kas-shopee-performance.vercel.app";

// Sau khi iframe báo onLoad, app nguồn có script "child" của iframe-resizer nên
// phải bắt tay trong vài giây. Quá hạn này coi như nhúng không lên được
// (thường do CSP frame-ancestors bên app nguồn chưa whitelist domain hiện tại).
const HANDSHAKE_TIMEOUT_MS = 6000;

// Lưới an toàn: dù child báo về chiều cao nào, iframe cũng không co xuống dưới
// mức này. Chống hẳn trường hợp báo cáo bị collapse thành khung trắng.
const MIN_EMBED_HEIGHT = 600;

// Format message child của iframe-resizer 4.x gửi lên parent:
//   [iFrameSizer]<iframeId>:<height>:<width>:<type>
const IFRAME_SIZER_MESSAGE = /^\[iFrameSizer\][^:]+:([\d.]+):[\d.]+:/;

// Child chỉ đo lại khi được yêu cầu hoặc khi DOM đổi. Sau lần load đầu nội dung
// còn render bất đồng bộ, nên thúc vài nhịp để bắt được chiều cao cuối cùng.
const RESIZE_NUDGES_MS = [300, 1500, 3500];

type EmbedState = "loading" | "connected" | "unreachable" | "navigated";

interface OpsHealthIframeProps {
  scope: DataScope;
}

// App nguồn chưa bao giờ hỗ trợ ?period, và toggle ngày/tháng đã bị gỡ khỏi
// giao diện vì không có tác dụng. Giữ tham số trong URL để không phá hợp đồng
// đã thống nhất với team KAS, cố định ở "day".
const DEFAULT_PERIOD = "day";

export default function OpsHealthIframe({ scope }: OpsHealthIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [embedState, setEmbedState] = useState<EmbedState>("loading");
  const [hostOrigin, setHostOrigin] = useState("");
  // App nguồn tự điều hướng iframe sang docs.google.com khi không đọc được
  // Google Sheet nguồn, và trang lỗi của Google chiếm nguyên khung báo cáo.
  // Cross-origin nên không đọc được location; đếm số lần `load` thay thế:
  // SPA đổi route không phát `load`, chỉ điều hướng thật mới phát.
  const loadCountRef = useRef(0);

  // Query string chỉ áp dụng cho lần mount đầu tiên. App nguồn hiện mới hỗ trợ
  // ?scope=spb|spe; ?period=day|month sẽ bị ignore (không lỗi) cho tới khi bên
  // kas-shopee-performance bổ sung toggle ngày/tháng ở mức global.
  const [src] = useState(
    () => `${KAS_ORIGIN}/?scope=${scope.toLowerCase()}&period=${DEFAULT_PERIOD}`,
  );

  // Đổi scope/period sau khi iframe đã load: dùng postMessage thay vì đổi src
  // (đổi src sẽ reload iframe và mất state/scroll đang xem).
  useEffect(() => {
    if (!hasLoadedOnce) return;
    const el = iframeRef.current;
    el?.contentWindow?.postMessage(
      { source: "control-tower", type: "set-scope", scope },
      KAS_ORIGIN,
    );
    // { source: 'control-tower', type: 'set-period', period } — gửi kèm khi app
    // nguồn đã hỗ trợ lắng nghe.

    // Đổi scope => nội dung khác => chiều cao khác. Thúc child đo lại sau khi
    // nó kịp render xong scope mới.
    const timer = window.setTimeout(
      () => (el as IFrameComponent | null)?.iFrameResizer?.resize(),
      600,
    );
    return () => window.clearTimeout(timer);
  }, [scope, hasLoadedOnce]);

  // Auto-resize theo chiều cao nội dung thật. App nguồn đã nhúng sẵn script
  // "child" của iframe-resizer, phía này chỉ cần gọi iframeResizer() lên element.
  useEffect(() => {
    const el = iframeRef.current;
    if (!isLoaded || !el) return;

    // Vẫn cần iframeResizer() để bắt tay: child chỉ chịu đo và gửi chiều cao cho
    // parent nào đã init nó.
    iframeResizer(
      {
        checkOrigin: [KAS_ORIGIN],
        log: false,
        // 'bodyOffset' (mặc định) đo layout app nguồn ra 0 => iframe collapse
        // còn khung trắng. 'lowestElement' duyệt DOM tìm điểm thấp nhất thay vì
        // dựa vào chiều cao body nên đo đúng.
        heightCalculationMethod: "lowestElement",
        // Bắt tay thành công => nhúng chắc chắn hiển thị được.
        onInit: () => setEmbedState("connected"),
      },
      el,
    );

    // Child tính đúng chiều cao và gửi lên, nhưng phần parent của v4 không áp
    // dụng cho app này — iframe kẹt nguyên ở mức sàn dù message báo 1970px. Tự
    // đọc message và set height, thay vì phụ thuộc vào phần đó của lib.
    const applyReportedHeight = (event: MessageEvent) => {
      if (event.origin !== KAS_ORIGIN) return;
      const match = IFRAME_SIZER_MESSAGE.exec(String(event.data));
      if (!match) return;
      const reported = Math.ceil(Number.parseFloat(match[1]));
      if (!Number.isFinite(reported) || reported <= 0) return;
      el.style.height = `${Math.max(reported, MIN_EMBED_HEIGHT)}px`;
    };
    window.addEventListener("message", applyReportedHeight);

    const nudges = RESIZE_NUDGES_MS.map((delay) =>
      window.setTimeout(
        () => (el as IFrameComponent).iFrameResizer?.resize(),
        delay,
      ),
    );

    const timer = window.setTimeout(() => {
      // Domain thật của Control Tower — hiển thị trong thông báo lỗi để gửi
      // cho team KAS khai báo frame-ancestors.
      setHostOrigin(window.location.origin);
      setEmbedState((prev) => (prev === "connected" ? prev : "unreachable"));
    }, HANDSHAKE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timer);
      nudges.forEach(window.clearTimeout);
      window.removeEventListener("message", applyReportedHeight);
      (el as IFrameComponent).iFrameResizer?.close();
    };
  }, [isLoaded]);

  function handleLoad() {
    loadCountRef.current += 1;
    if (loadCountRef.current > 1) {
      setEmbedState("navigated");
      return;
    }
    setIsLoaded(true);
    setHasLoadedOnce(true);
  }

  function reloadFrame() {
    const el = iframeRef.current;
    if (!el) return;
    loadCountRef.current = 0;
    setIsLoaded(false);
    setHasLoadedOnce(false);
    setEmbedState("loading");
    el.style.height = "";
    el.src = src;
  }

  return (
    <div className={styles.embed}>
      {!isLoaded && (
        <div className={styles.skeleton} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Đang tải Báo Cáo Điều Hành Shopee…</span>
        </div>
      )}

      {embedState === "unreachable" && (
        <div className={styles.notice} role="alert">
          <div className={styles.noticeTitle}>
            Chưa hiển thị được báo cáo nhúng
          </div>
          <p className={styles.noticeBody}>
            Iframe từ <code>{KAS_ORIGIN}</code> không phản hồi. Nguyên nhân
            thường gặp: CSP <code>frame-ancestors</code> phía app nguồn chưa cho
            phép domain này nhúng. Mở DevTools → Console để xem thông báo chặn
            cụ thể.
          </p>
          {hostOrigin && (
            <p className={styles.noticeBody}>
              Domain cần gửi team KAS whitelist: <code>{hostOrigin}</code>
            </p>
          )}
          <a
            className={styles.noticeLink}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở báo cáo ở tab mới ↗
          </a>
        </div>
      )}

      {embedState === "navigated" && (
        <div className={styles.notice} role="alert">
          <div className={styles.noticeTitle}>
            Khung báo cáo đã chuyển sang trang khác
          </div>
          <p className={styles.noticeBody}>
            Iframe không còn ở <code>{KAS_ORIGIN}</code> nữa. App báo cáo tự
            điều hướng sang Google khi không đọc được Google Sheet nguồn — thường
            là do tài khoản Google đang đăng nhập không có quyền trên sheet đó
            (Google trả <code>403</code>).
          </p>
          <p className={styles.noticeBody}>
            Cần team KAS cấp quyền đọc sheet nguồn cho tài khoản của bạn. Nếu
            trình duyệt đang đăng nhập nhiều tài khoản Google, thử lại bằng cửa
            sổ ẩn danh để loại trừ việc chọn nhầm tài khoản.
          </p>
          <button
            type="button"
            className={styles.noticeLink}
            onClick={reloadFrame}
          >
            Tải lại khung báo cáo
          </button>{" "}
          <a
            className={styles.noticeLink}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở báo cáo ở tab mới ↗
          </a>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        title="GHN KAS — Báo Cáo Điều Hành Shopee"
        onLoad={handleLoad}
        style={{ display: isLoaded ? "block" : "none" }}
        className={styles.iframe}
        // Không set sandbox: app nguồn có login Supabase (OAuth) cần same-origin,
        // scripts, forms và popups.
        allow="clipboard-write"
      />
    </div>
  );
}
