"use client";

import { useState } from "react";
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

      <div className={styles.meta}>Đăng nhập: {userEmail}</div>
    </nav>
  );
}
