"use client";

import { useEffect, useState } from "react";
import { SCOPE_LABEL } from "@/lib/labels";
import { formatNumber, formatPercent, formatPp } from "@/lib/format";
import type { Direction } from "@/lib/campaignData";
import type {
  CampaignPayload,
  CampaignScopePayload,
} from "@/lib/campaignViewModel";
import type { CampaignRow, ProvinceRow } from "@/lib/campaignMetrics";
import type { DataScope } from "@/lib/tabs";
import Toggle from "./Toggle";
import styles from "./CampaignOverview.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: CampaignPayload };

export default function CampaignOverview({ scope }: { scope: DataScope }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [campaign, setCampaign] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>("to");

  useEffect(() => {
    let cancelled = false;

    // Số liệu không nằm sẵn trong bundle: phải hỏi /api/campaign, nơi kiểm tra
    // đăng nhập trước khi trả về.
    fetch("/api/campaign")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return setState({
            status: "error",
            message: body?.message ?? `Máy chủ trả lỗi ${res.status}.`,
          });
        }
        const payload = (await res.json()) as CampaignPayload;
        setState({ status: "ready", payload });
        setCampaign((prev) => prev ?? payload.latestCampaign);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              err instanceof Error ? err.message : "Không gọi được API.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className={styles.gate} role="status" aria-live="polite">
        <div className={styles.gateSpinner} />
        <p>Đang tải số liệu campaign…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={styles.gate}>
        <p>{state.message}</p>
      </div>
    );
  }

  const { payload } = state;
  const data: CampaignScopePayload = payload.scopes[scope];
  const activeCampaign = campaign ?? payload.latestCampaign;

  const rows = data.rows;
  const current =
    rows.find((r) => r.campaign === activeCampaign) ?? rows[0];
  const ranking = data.rankings[activeCampaign]?.[direction];
  const top = ranking?.top ?? [];
  const bottom = ranking?.bottom ?? [];
  const qualified = ranking?.qualified ?? 0;

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>
            {activeCampaign} — {SCOPE_LABEL[scope]}
          </h2>
          <span className={styles.source}>
            Nguồn:{" "}
            <a href={payload.sourceUrl} target="_blank" rel="noopener noreferrer">
              tower control raw · raw tab 2 ↗
            </a>{" "}
            · snapshot {payload.snapshotAt}
          </span>
        </div>

        <div className={styles.controls}>
          <Toggle
            ariaLabel="Chọn kỳ campaign"
            variant="blue"
            size="sm"
            value={activeCampaign}
            onChange={setCampaign}
            options={payload.campaigns.map((c) => ({ value: c, label: c }))}
          />
        </div>

        <p className={styles.caveat}>
          ODR = đơn giao đúng hạn / đơn trong mẫu, tính lại theo trọng số đơn
          (không lấy trung bình cộng ODR các tỉnh). Dữ liệu ngày thường
          (<b>baseline</b>) chỉ có ở D0, nên phần so sánh bên dưới là{" "}
          <b>CP D0 so với ngày thường D0</b> — không đem D+1 ra so.
        </p>

        <div className={styles.kpis}>
          <Kpi
            label="Đơn trong mẫu (D0 + D+1)"
            value={formatNumber(current.cpOrders)}
          />
          <Kpi label="ODR ngày D0" value={formatPercent(current.cpD0.odr)} />
          <Kpi label="ODR ngày D+1" value={formatPercent(current.cpD1.odr)} />
          <Kpi
            label="ODR ngày thường (D0)"
            value={formatPercent(current.baselineD0.odr)}
          />
          <Kpi
            label="Chênh lệch vs ngày thường"
            value={formatPp(current.deltaD0Pp)}
            tone={current.deltaD0Pp >= 0 ? "up" : "down"}
            hint="CP D0 − baseline D0"
          />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>ODR qua các kỳ campaign</h2>
          <div className={styles.legend}>
            <span>
              <i className={styles.swD0} /> CP · D0
            </span>
            <span>
              <i className={styles.swD1} /> CP · D+1
            </span>
            <span>
              <i className={styles.swBase} /> Ngày thường · D0
            </span>
          </div>
        </div>
        <OdrChart rows={rows} />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Bảng KPI theo kỳ campaign</h2>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Kỳ</th>
                <th scope="col">Đơn D0</th>
                <th scope="col">ODR D0</th>
                <th scope="col">Đơn D+1</th>
                <th scope="col">ODR D+1</th>
                <th scope="col">ODR ngày thường</th>
                <th scope="col">Chênh lệch D0</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.campaign}
                  className={
                    row.campaign === activeCampaign
                      ? styles.rowActive
                      : undefined
                  }
                >
                  <th scope="row">{row.campaign}</th>
                  <td>{formatNumber(row.cpD0.orders)}</td>
                  <td>{formatPercent(row.cpD0.odr)}</td>
                  <td>{formatNumber(row.cpD1.orders)}</td>
                  <td>{formatPercent(row.cpD1.odr)}</td>
                  <td>{formatPercent(row.baselineD0.odr)}</td>
                  <td
                    className={row.deltaD0Pp >= 0 ? styles.up : styles.down}
                  >
                    {formatPp(row.deltaD0Pp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Tỉnh tốt nhất và kém nhất — {activeCampaign} · D0</h2>
          <Toggle
            ariaLabel="Chọn chiều tỉnh"
            size="sm"
            value={direction}
            onChange={setDirection}
            options={[
              { value: "to", label: "Tỉnh giao (Delivery)" },
              { value: "from", label: "Tỉnh lấy (Pickup)" },
            ]}
          />
        </div>

        {qualified === 0 ? (
          <p className={styles.note}>
            Không có tỉnh nào đạt tối thiểu {formatNumber(payload.minSample)} đơn
            trong mẫu ở kỳ này.
          </p>
        ) : (
          <div className={styles.rankGrid}>
            <RankTable title="Top 5 ODR cao nhất" rows={top} tone="up" />
            <RankTable title="Top 5 ODR thấp nhất" rows={bottom} tone="down" />
          </div>
        )}

        <p className={styles.note}>
          Chỉ xếp hạng các tỉnh có tối thiểu {formatNumber(payload.minSample)}{" "}
          đơn trong mẫu — {qualified}/{payload.totalProvinces} tỉnh đủ điều kiện
          ở kỳ này. Tỉnh mẫu nhỏ bị loại vì vài đơn cũng đủ đẩy ODR về 0% hoặc
          100%.
        </p>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{label}</div>
      <div
        className={[
          styles.kpiValue,
          tone === "up" ? styles.up : "",
          tone === "down" ? styles.down : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </div>
      {hint && <div className={styles.kpiHint}>{hint}</div>}
    </div>
  );
}

function RankTable({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: ProvinceRow[];
  tone: "up" | "down";
}) {
  return (
    <div>
      <h3 className={styles.rankTitle}>{title}</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Tỉnh</th>
            <th scope="col">Đơn</th>
            <th scope="col">ODR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.province}>
              <th scope="row">{row.province}</th>
              <td>{formatNumber(row.orders)}</td>
              <td className={tone === "up" ? styles.up : styles.down}>
                {formatPercent(row.odr)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Cột nhóm 3 series bằng SVG thuần — cùng cách làm với biểu đồ ở tab kinh doanh.
function OdrChart({ rows }: { rows: CampaignRow[] }) {
  const width = 760;
  const height = 300;
  const padding = { top: 16, right: 12, bottom: 34, left: 52 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // ODR nằm trong khoảng hẹp (~0,75–0,92) nên trục bắt đầu từ 0,6 để nhìn rõ
  // chênh lệch. Trục không từ 0 — có ghi chú ngay dưới biểu đồ.
  const floor = 0.6;
  const top = 1;
  const y = (value: number) =>
    padding.top + plotH - ((value - floor) / (top - floor)) * plotH;
  const ticks = [0.6, 0.7, 0.8, 0.9, 1];

  const groupW = plotW / rows.length;
  const barW = Math.min(40, (groupW - 32) / 3);

  const series: { key: "cpD0" | "cpD1" | "baselineD0"; cls: string }[] = [
    { key: "cpD0", cls: styles.barD0 },
    { key: "cpD1", cls: styles.barD1 },
    { key: "baselineD0", cls: styles.barBase },
  ];

  return (
    <>
      <div className={styles.chartScroll}>
        <svg
          className={styles.chart}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Biểu đồ ODR theo kỳ campaign, so ngày D0, D+1 và ngày thường"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y(tick)}
                y2={y(tick)}
                className={styles.grid}
              />
              <text
                x={padding.left - 8}
                y={y(tick) + 4}
                textAnchor="end"
                className={styles.axisLabel}
              >
                {formatPercent(tick, 0)}
              </text>
            </g>
          ))}

          {rows.map((row, index) => {
            const groupX = padding.left + index * groupW;
            const startX = groupX + groupW / 2 - (barW * 3 + 12) / 2;
            return (
              <g key={row.campaign}>
                {series.map((s, i) => {
                  const value = row[s.key].odr;
                  const barX = startX + i * (barW + 6);
                  return (
                    <rect
                      key={s.key}
                      x={barX}
                      y={y(value)}
                      width={barW}
                      height={Math.max(0, padding.top + plotH - y(value))}
                      className={s.cls}
                    >
                      <title>{`${row.campaign} · ${s.key} · ODR ${formatPercent(value)}`}</title>
                    </rect>
                  );
                })}
                <text
                  x={groupX + groupW / 2}
                  y={height - 12}
                  textAnchor="middle"
                  className={styles.axisLabel}
                >
                  {row.campaign}
                </text>
              </g>
            );
          })}

          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotH}
            y2={padding.top + plotH}
            className={styles.axis}
          />
        </svg>
      </div>
      <p className={styles.note}>
        Trục dọc bắt đầu từ 60% (không từ 0) để thấy rõ chênh lệch — đọc mức
        tuyệt đối theo nhãn trục, đừng so chiều cao cột theo tỷ lệ.
      </p>
    </>
  );
}
