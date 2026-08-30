"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { NAV_BLOCKS, type DataScope, type TabId } from "@/lib/tabs";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  scope: DataScope;
  userEmail: string;
  /** Mở drawer trên mobile (<=900px). Trên desktop sidebar luôn hiện. */
  isDrawerOpen: boolean;
  /** Thu gọn còn thanh hẹp (chỉ có tác dụng trên desktop). */
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  scope,
  userEmail,
  isDrawerOpen,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<string | null>("cskh");

  return (
    <nav
      className={[
        styles.sidebar,
        isDrawerOpen ? styles.drawerOpen : "",
        isCollapsed ? styles.collapsed : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className={styles.collapseBtn}
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? "Mở rộng mục lục" : "Thu gọn mục lục"}
        title={isCollapsed ? "Mở rộng mục lục" : "Thu gọn mục lục"}
      >
        <span aria-hidden="true">‹</span>
      </button>

      <div className={styles.brand}>
        <div className={styles.logo}>GHN</div>
        <div>
          <div className={styles.brandName}>Control Tower</div>
          <div className={styles.brandSub}>Shopee Account — {scope}</div>
        </div>
      </div>

      <div className={styles.groupLabel}>Tổng quan</div>

      {NAV_BLOCKS.map((block) => {
        const isActive = block.children
          ? block.children.some((c) => c.tab === activeTab)
          : block.tab === activeTab;
        const isOpen = expanded === block.id;

        return (
          <div
            key={block.id}
            className={[
              styles.navblock,
              isActive ? styles.activeBlock : "",
              isOpen ? styles.open : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <button
              type="button"
              className={styles.head}
              onClick={() =>
                block.children
                  ? setExpanded(isOpen ? null : block.id)
                  : onSelectTab(block.tab!)
              }
              aria-expanded={block.children ? isOpen : undefined}
              title={block.label}
            >
              <span className={styles.dot} />
              <span>{block.label}</span>
              {block.children && <span className={styles.chev}>›</span>}
            </button>

            {block.children && (
              <div className={styles.children}>
                {block.children.map((child) => (
                  <button
                    key={child.tab}
                    type="button"
                    className={[
                      styles.subitem,
                      activeTab === child.tab ? styles.subActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onSelectTab(child.tab)}
                  >
                    <span className={styles.dot} />
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <SessionBox fallbackEmail={userEmail} />
    </nav>
  );
}

/**
 * Hiện tài khoản đang đăng nhập và nút đăng xuất.
 *
 * Không có nút này thì không ai kiểm chứng được luồng đăng nhập: reload trang
 * chỉ đọc lại cookie phiên, không chạm tới client secret của Google. Muốn biết
 * secret còn khớp hay không thì phải đăng xuất rồi đăng nhập lại.
 */
function SessionBox({ fallbackEmail }: { fallbackEmail: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setEmail(data?.user?.email ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) {
    return <div className={styles.meta}>Đăng nhập: {fallbackEmail}</div>;
  }

  return (
    <div className={styles.meta}>
      {email ? (
        <>
          Đăng nhập: {email}
          <button
            type="button"
            className={styles.sessionBtn}
            onClick={() => signOut({ redirectTo: "/" })}
          >
            Đăng xuất
          </button>
        </>
      ) : (
        <>
          Chưa đăng nhập
          <button
            type="button"
            className={styles.sessionBtn}
            onClick={() => signIn("google")}
          >
            Đăng nhập
          </button>
        </>
      )}
    </div>
  );
}
