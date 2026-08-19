"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Toggle from "./Toggle";
import Placeholder from "./Placeholder";
import OpsHealthIframe from "./OpsHealthIframe";
import { PLACEHOLDERS } from "@/lib/placeholders";
import {
  TAB_TITLES,
  type DataPeriod,
  type DataScope,
  type TabId,
} from "@/lib/tabs";
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
  const [dataPeriod, setDataPeriod] = useState<DataPeriod>("day");

  return (
    <>
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        scope={dataScope}
        userEmail={userEmail}
      />

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.crumb}>Control Tower / Shopee Account</div>
            <h1>{TAB_TITLES[activeTab]}</h1>
          </div>
          <div className={styles.toggles}>
            <Toggle
              ariaLabel="Chọn nhóm dịch vụ"
              variant="blue"
              value={dataScope}
              onChange={setDataScope}
              options={[
                { value: "SPB", label: "SPB (Bulky)" },
                { value: "SPE", label: "SPE (Express)" },
              ]}
            />
            <Toggle
              ariaLabel="Chọn kỳ dữ liệu"
              value={dataPeriod}
              onChange={setDataPeriod}
              options={[
                { value: "day", label: "Theo ngày" },
                { value: "month", label: "Theo tháng" },
              ]}
            />
          </div>
        </div>

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

        {activeTab === "ops" ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <h2>GHN KAS — Báo Cáo Điều Hành Shopee</h2>
              <span className={styles.note}>
                Scope: <b>{dataScope}</b> · Nhúng từ kas-shopee-performance
              </span>
            </div>
            <OpsHealthIframe scope={dataScope} period={dataPeriod} />
          </div>
        ) : (
          <Placeholder
            title={TAB_TITLES[activeTab]}
            {...PLACEHOLDERS[activeTab]}
          />
        )}
      </main>
    </>
  );
}
