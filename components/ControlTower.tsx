"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Toggle from "./Toggle";
import Placeholder from "./Placeholder";
import OpsHealthIframe from "./OpsHealthIframe";
import BizOverview from "./BizOverview";
import CampaignOverview from "./CampaignOverview";
import { PLACEHOLDERS } from "@/lib/placeholders";
import { TAB_TITLES, type DataScope, type TabId } from "@/lib/tabs";
import styles from "./ControlTower.module.css";

const SOURCES = [
  "Sheet FC (Drive)",
  "KATMS",
  "Dashboard KPI (kas-shopee-performance)",
  "Case KAC",
];

export default function ControlTower({ userEmail }: { userEmail: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("biz");
  const [dataScope, setDataScope] = useState<DataScope>("SPB");
  // Drawer chỉ có tác dụng <=900px; desktop sidebar luôn hiện.
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  function handleSelectTab(tab: TabId) {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  }

  return (
    <>
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        scope={dataScope}
        userEmail={userEmail}
        isDrawerOpen={isDrawerOpen}
        isCollapsed={isNavCollapsed}
        onToggleCollapse={() => setIsNavCollapsed((v) => !v)}
      />

      {isDrawerOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Đóng menu điều hướng"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <main
        className={[styles.main, isNavCollapsed ? styles.mainWide : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.topbar}>
          <div className={styles.titleGroup}>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label="Mở menu điều hướng"
              aria-expanded={isDrawerOpen}
              onClick={() => setIsDrawerOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <div className={styles.crumb}>Control Tower / Shopee Account</div>
              <h1>{TAB_TITLES[activeTab]}</h1>
            </div>
          </div>
          <div className={styles.toggles}>
            {/* Tab kinh doanh hiển thị đồng thời cả hai scope nên toggle này
                không có gì để lọc — ẩn đi thay vì để một nút bấm vô tác dụng. */}
            {activeTab !== "biz" && (
              <Toggle
                ariaLabel="Chọn nhóm dịch vụ"
                variant="blue"
                value={dataScope}
                onChange={setDataScope}
                options={[
                  { value: "SPB", label: "SPB (Bulky)" },
                  { value: "SPE", label: "SPE (Standard)" },
                ]}
              />
            )}
          </div>
        </div>

        {activeTab === "biz" ? (
          <BizOverview />
        ) : activeTab === "campaign" ? (
          <CampaignOverview scope={dataScope} />
        ) : activeTab === "ops" ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <h2>GHN KAS — Báo Cáo Điều Hành Shopee</h2>
              <span className={styles.note}>
                Scope: <b>{dataScope}</b> · Nhúng từ kas-shopee-performance
              </span>
            </div>
            <OpsHealthIframe scope={dataScope} />
          </div>
        ) : (
          <Placeholder
            title={TAB_TITLES[activeTab]}
            {...PLACEHOLDERS[activeTab]}
          />
        )}

        <footer className={styles.pageFoot}>
          <div className={styles.freshbar}>
            {SOURCES.map((source) => (
              <span key={source}>
                <span className={styles.ok} />
                {source}
              </span>
            ))}
            <span className={styles.freshNote}>
              Trạng thái nguồn dữ liệu — thời điểm cập nhật sẽ hiển thị khi các
              tab được kết nối dữ liệu thật
            </span>
          </div>
        </footer>
      </main>
    </>
  );
}
