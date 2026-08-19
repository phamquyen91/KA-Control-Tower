"use client";

import { useEffect, useRef, useState } from "react";
// ^4.4.5 (MIT) — cùng bản với app nguồn. KHÔNG dùng v5+ (GPL-3.0/thương mại).
import { iframeResizer, type IFrameComponent } from "iframe-resizer";
import type { DataPeriod, DataScope } from "@/lib/tabs";
import styles from "./OpsHealthIframe.module.css";

const KAS_ORIGIN =
  process.env.NEXT_PUBLIC_KAS_ORIGIN ??
  "https://kas-shopee-performance.vercel.app";

interface OpsHealthIframeProps {
  scope: DataScope;
  period: DataPeriod;
}

export default function OpsHealthIframe({
  scope,
  period,
}: OpsHealthIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Query string chỉ áp dụng cho lần mount đầu tiên. App nguồn hiện mới hỗ trợ
  // ?scope=spb|spe; ?period=day|month sẽ bị ignore (không lỗi) cho tới khi bên
  // kas-shopee-performance bổ sung toggle ngày/tháng ở mức global.
  const [src] = useState(
    () => `${KAS_ORIGIN}/?scope=${scope.toLowerCase()}&period=${period}`,
  );

  // Đổi scope/period sau khi iframe đã load: dùng postMessage thay vì đổi src
  // (đổi src sẽ reload iframe và mất state/scroll đang xem).
  useEffect(() => {
    if (!hasLoadedOnce) return;
    iframeRef.current?.contentWindow?.postMessage(
      { source: "control-tower", type: "set-scope", scope },
      KAS_ORIGIN,
    );
    // { source: 'control-tower', type: 'set-period', period } — gửi kèm khi app
    // nguồn đã hỗ trợ lắng nghe.
  }, [scope, period, hasLoadedOnce]);

  // Auto-resize theo chiều cao nội dung thật. App nguồn đã nhúng sẵn script
  // "child" của iframe-resizer, phía này chỉ cần gọi iframeResizer() lên element.
  useEffect(() => {
    const el = iframeRef.current;
    if (!isLoaded || !el) return;

    iframeResizer({ checkOrigin: [KAS_ORIGIN], log: false }, el);

    return () => {
      (el as IFrameComponent).iFrameResizer?.close();
    };
  }, [isLoaded]);

  return (
    <div className={styles.embed}>
      {!isLoaded && (
        <div className={styles.skeleton} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Đang tải Báo Cáo Điều Hành Shopee…</span>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        title="GHN KAS — Báo Cáo Điều Hành Shopee"
        onLoad={() => {
          setIsLoaded(true);
          setHasLoadedOnce(true);
        }}
        style={{ display: isLoaded ? "block" : "none" }}
        className={styles.iframe}
        // Không set sandbox: app nguồn có login Supabase (OAuth) cần same-origin,
        // scripts, forms và popups.
        allow="clipboard-write"
      />
    </div>
  );
}
