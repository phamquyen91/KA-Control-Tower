"use client";

import {
  BIZ_SNAPSHOT_AT,
  BIZ_SOURCE_URL,
  type Lane,
  type WeightBand,
} from "@/lib/bizData";
import {
  bizSummary,
  formatCompact,
  formatMonth,
  formatMonthShort,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  laneBreakdown,
  monthlySeries,
  weightBreakdown,
  type BreakdownRow,
} from "@/lib/bizMetrics";
import type { DataScope } from "@/lib/tabs";
import styles from "./BizOverview.module.css";

const SCOPE_LABEL: Record<DataScope, string> = {
  SPB: "Shopee Bulky",
  SPE: "Shopee Express",
};

// Ngày cuối cùng có số liệu trong snapshot. Tháng cuối vì thế chưa đủ tháng —
// mọi so sánh MoM với tháng đó đều lệch, nên phải nói rõ trên giao diện.
const SNAPSHOT_LABEL = "19/08/2026";

export default function BizOverview({ scope }: { scope: DataScope }) {
  const series = monthlySeries(scope);
  const summary = bizSummary(scope);
  const lanes = laneBreakdown(scope, summary.month, summary.prevMonth);
  const weights = weightBreakdown(scope, summary.month, summary.prevMonth);

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>
            Sản lượng {SCOPE_LABEL[scope]} — {formatMonth(summary.month)}
          </h2>
          <span className={styles.source}>
            Nguồn:{" "}
            <a href={BIZ_SOURCE_URL} target="_blank" rel="noopener noreferrer">
              tower control raw · raw_1 ↗
            </a>{" "}
            · snapshot {BIZ_SNAPSHOT_AT}
          </span>
        </div>

        <p className={styles.caveat}>
          Số liệu chốt tới <b>{SNAPSHOT_LABEL}</b>, nên{" "}
          {formatMonth(summary.month)} <b>chưa đủ tháng</b>. Các chỉ số MoM bên
          dưới đang so một tháng khuyết với một tháng đủ — đọc theo hướng, đừng
          lấy làm mức tăng trưởng thật.
        </p>

        <div className={styles.kpis}>
          <Kpi label="Created" value={formatNumber(summary.created)} />
          <Kpi label="GTTC" value={formatNumber(summary.gtc)} />
          <Kpi
            label="GTTC / Created"
            value={formatPercent(summary.gtcRate)}
            hint="Tỷ lệ giao thành công trên đơn tạo"
          />
          <Kpi
            label={`MoM vs ${summary.prevMonth ? formatMonth(summary.prevMonth) : "—"}`}
            value={formatSignedPercent(summary.momCreated)}
            tone={
              summary.momCreated === null
                ? undefined
                : summary.momCreated >= 0
                  ? "up"
                  : "down"
            }
            hint="Chưa loại trừ việc tháng cuối khuyết ngày"
          />
          <Kpi
            label="Created luỹ kế 8 tháng"
            value={formatNumber(summary.ytdCreated)}
          />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Created và GTTC theo tháng</h2>
          <div className={styles.legend}>
            <span>
              <i className={styles.swatchCreated} /> Created
            </span>
            <span>
              <i className={styles.swatchGtc} /> GTTC
            </span>
          </div>
        </div>
        <MonthlyChart series={series} />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Tỷ trọng theo loại lane — {formatMonth(summary.month)}</h2>
        </div>
        <BreakdownTable rows={lanes} firstColumn="Lane" />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Cơ cấu theo nhóm trọng lượng — {formatMonth(summary.month)}</h2>
        </div>
        <BreakdownTable rows={weights} firstColumn="Nhóm trọng lượng" />
        {scope === "SPE" && (
          <p className={styles.note}>
            SPE gần như toàn bộ nằm ở nhóm &lt;15kg; nhóm ≥15kg chỉ vài chục đơn
            mỗi tháng nên tỷ trọng làm tròn về 0,0%.
          </p>
        )}
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

// Biểu đồ cột nhóm, vẽ bằng SVG thuần: không thêm dependency và không cần
// script ngoài (CSP của app chỉ cho phép 'self').
function MonthlyChart({
  series,
}: {
  series: { month: string; created: number; gtc: number }[];
}) {
  const width = 760;
  const height = 300;
  const padding = { top: 16, right: 12, bottom: 34, left: 56 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const max = Math.max(...series.flatMap((p) => [p.created, p.gtc]));
  // Làm tròn trần lên để đường lưới ra số đẹp.
  const step = Math.pow(10, Math.floor(Math.log10(max))) / 2;
  const top = Math.ceil(max / step) * step;

  const groupW = plotW / series.length;
  const barW = Math.min(26, (groupW - 14) / 2);
  const y = (value: number) => padding.top + plotH - (value / top) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * top);

  return (
    <div className={styles.chartScroll}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Biểu đồ cột sản lượng Created và GTTC theo tháng"
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
              {formatCompact(tick)}
            </text>
          </g>
        ))}

        {series.map((point, index) => {
          const groupX = padding.left + index * groupW;
          const createdX = groupX + groupW / 2 - barW - 3;
          const gtcX = groupX + groupW / 2 + 3;
          return (
            <g key={point.month}>
              <rect
                x={createdX}
                y={y(point.created)}
                width={barW}
                height={padding.top + plotH - y(point.created)}
                className={styles.barCreated}
              >
                <title>{`${formatMonth(point.month)} · Created: ${formatNumber(point.created)}`}</title>
              </rect>
              <rect
                x={gtcX}
                y={y(point.gtc)}
                width={barW}
                height={padding.top + plotH - y(point.gtc)}
                className={styles.barGtc}
              >
                <title>{`${formatMonth(point.month)} · GTTC: ${formatNumber(point.gtc)}`}</title>
              </rect>
              <text
                x={groupX + groupW / 2}
                y={height - 12}
                textAnchor="middle"
                className={styles.axisLabel}
              >
                {formatMonthShort(point.month)}
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
  );
}

function BreakdownTable<T extends Lane | WeightBand>({
  rows,
  firstColumn,
}: {
  rows: BreakdownRow<T>[];
  firstColumn: string;
}) {
  const total = rows.reduce(
    (acc, r) => ({ created: acc.created + r.created, gtc: acc.gtc + r.gtc }),
    { created: 0, gtc: 0 },
  );

  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{firstColumn}</th>
            <th scope="col">Created</th>
            <th scope="col">Tỷ trọng</th>
            <th scope="col">GTTC</th>
            <th scope="col">GTTC / Created</th>
            <th scope="col">MoM Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.key}</th>
              <td>{formatNumber(row.created)}</td>
              <td>
                <div className={styles.shareCell}>
                  <span
                    className={styles.shareBar}
                    style={{ width: `${Math.round(row.share * 100)}%` }}
                  />
                  <span>{formatPercent(row.share)}</span>
                </div>
              </td>
              <td>{formatNumber(row.gtc)}</td>
              <td>{formatPercent(row.gtcRate)}</td>
              <td
                className={
                  row.momCreated === null
                    ? undefined
                    : row.momCreated >= 0
                      ? styles.up
                      : styles.down
                }
              >
                {formatSignedPercent(row.momCreated)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Tổng</th>
            <td>{formatNumber(total.created)}</td>
            <td>100,0%</td>
            <td>{formatNumber(total.gtc)}</td>
            <td>
              {formatPercent(
                total.created === 0 ? 0 : total.gtc / total.created,
              )}
            </td>
            <td>—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
