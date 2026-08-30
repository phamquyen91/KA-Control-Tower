"use client";

import {
  BIZ_MONTHS,
  BIZ_SNAPSHOT_AT,
  BIZ_SOURCE_URL,
  LANE_ORDER,
  SCOPE_LABEL,
  WEIGHT_ORDER,
  bandLabel,
} from "@/lib/bizData";
import {
  aopCompletion,
  bandShareByMonth,
  fcCompletion,
  formatMonth,
  formatMonthShort,
  formatNumber,
  formatPercent,
  laneShareByMonth,
  monthlyByBand,
  scopeProgress,
  type ScopeProgress,
} from "@/lib/bizMetrics";
import type { DataScope } from "@/lib/tabs";
import VolumeChart, {
  type BarSegment,
  type LineSeries,
} from "./VolumeChart";
import chart from "./VolumeChart.module.css";
import styles from "./BizOverview.module.css";

// Snapshot chốt giữa tháng 8 nên tháng cuối khuyết ngày — mọi con số MTD và
// mức hoàn thành của tháng đó đều thấp hơn thực tế.
const SNAPSHOT_LABEL = "19/08/2026";

const LATEST_MONTH = BIZ_MONTHS[BIZ_MONTHS.length - 1];

export default function BizOverview() {
  return (
    <div className={styles.page}>
      <Section title="Tổng quan" subtitle={`GTTC so với AOP · ${formatMonth(LATEST_MONTH)}`}>
        <div className={styles.overviewGrid}>
          <ProgressPanel scope="SPB" />
          <ProgressPanel scope="SPE" />
        </div>
      </Section>

      <Section
        title="Sản lượng tháng"
        subtitle="Created so FC · GTTC so AOP"
      >
        <div className={styles.splitGrid}>
          <ScopeColumn scope="SPB" />
          <ScopeColumn scope="SPE" />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>{title}</h2>
        {subtitle && <span className={styles.sectionSub}>{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------- Phần 1 -------------------------------- */

function ProgressPanel({ scope }: { scope: DataScope }) {
  const progress = scopeProgress(scope);
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelBar} />
        <h3>{SCOPE_LABEL[scope]}</h3>
      </div>
      <div className={styles.statRow}>
        <StatCard title="GTTC YTD" stat={progress.ytd} spark={progress.spark} />
        <StatCard title="GTTC MTD" stat={progress.mtd} spark={progress.spark} />
      </div>
    </div>
  );
}

function StatCard({
  title,
  stat,
  spark,
}: {
  title: string;
  stat: ScopeProgress["ytd"];
  spark: number[];
}) {
  const ok = stat.completion >= 1;
  return (
    <div className={styles.stat}>
      <div className={styles.statTop}>
        <span className={styles.statTitle}>{title}</span>
        <span className={styles.statPeriod}>{stat.periodLabel}</span>
      </div>
      <div className={styles.statMain}>
        <span className={styles.statValue}>{formatNumber(stat.gtc)}</span>
        <span className={ok ? styles.badgeOk : styles.badgeMiss}>
          {formatPercent(stat.completion, 1)}
        </span>
      </div>
      <Sparkline values={spark} ok={ok} />
      <div className={styles.statFoot}>
        AOP cùng kỳ: {formatNumber(stat.target)}
      </div>
    </div>
  );
}

function Sparkline({ values, ok }: { values: number[]; ok: boolean }) {
  const w = 200;
  const h = 34;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const d = values
    .map((v, i) => `${i ? "L" : "M"}${i * step},${h - (v / max) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg
      className={styles.spark}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={`${d} L${w},${h} L0,${h} Z`}
        className={ok ? styles.sparkFillOk : styles.sparkFillMiss}
      />
      <path
        d={d}
        fill="none"
        className={ok ? styles.sparkLineOk : styles.sparkLineMiss}
      />
    </svg>
  );
}

/* ------------------------------- Phần 2 -------------------------------- */

function ScopeColumn({ scope }: { scope: DataScope }) {
  const stacked = scope === "SPB";
  const points = monthlyByBand(scope);

  const createdBars: BarSegment[][] = points.map((p) =>
    stacked
      ? p.bands.map((b) => ({
          key: b.band,
          label: bandLabel(b.band, scope),
          value: b.created,
          className: b.band === "<15kg" ? chart.barLow : chart.barHigh,
        }))
      : [
          {
            key: "total",
            label: "Created",
            value: p.created,
            className: chart.barPrimary,
          },
        ],
  );

  const gtcBars: BarSegment[][] = points.map((p) =>
    stacked
      ? p.bands.map((b) => ({
          key: b.band,
          label: bandLabel(b.band, scope),
          value: b.gtc,
          className: b.band === "<15kg" ? chart.barLow : chart.barHigh,
        }))
      : [
          {
            key: "total",
            label: "GTTC",
            value: p.gtc,
            className: chart.barSecondary,
          },
        ],
  );

  const createdLines: LineSeries[] = [
    {
      key: "fc-total",
      label: "Tổng vs FC",
      dashed: false,
      className: chart.lineTotal,
      values: points.map(
        (p) => fcCompletion(scope, p.month, p.created) ?? null,
      ),
    },
    ...(stacked
      ? WEIGHT_ORDER.map((band) => ({
          key: `fc-${band}`,
          label: `${bandLabel(band, scope)} vs FC`,
          dashed: true,
          className: band === "<15kg" ? chart.lineLow : chart.lineHigh,
          values: points.map((p) => {
            const cell = p.bands.find((b) => b.band === band);
            return cell
              ? (fcCompletion(scope, p.month, cell.created, band) ?? null)
              : null;
          }),
        }))
      : []),
  ];

  const gtcLines: LineSeries[] = [
    {
      key: "aop-total",
      label: "Tổng vs AOP",
      dashed: false,
      className: chart.lineTotal,
      values: points.map((p) => aopCompletion(scope, p.month, p.gtc) ?? null),
    },
    ...(stacked
      ? WEIGHT_ORDER.map((band) => ({
          key: `aop-${band}`,
          label: `${bandLabel(band, scope)} vs AOP`,
          dashed: true,
          className: band === "<15kg" ? chart.lineLow : chart.lineHigh,
          values: points.map((p) => {
            const cell = p.bands.find((b) => b.band === band);
            return cell
              ? (aopCompletion(scope, p.month, cell.gtc, band) ?? null)
              : null;
          }),
        }))
      : []),
  ];

  const missingFc = createdLines[0].values.some((v) => v === null);

  return (
    <div className={styles.column}>
      <div className={styles.panelHead}>
        <span className={styles.panelBar} />
        <h3>{SCOPE_LABEL[scope]}</h3>
      </div>

      <ChartCard
        title="Created Volume"
        note="Cột: sản lượng Created · Đường: mức hoàn thành so FC tháng"
        legend={<Legend scope={scope} stacked={stacked} target="FC" />}
      >
        <VolumeChart
          months={BIZ_MONTHS}
          bars={createdBars}
          lines={createdLines}
          ariaLabel={`Sản lượng Created và mức hoàn thành FC của ${SCOPE_LABEL[scope]}`}
        />
        {missingFc && (
          <p className={styles.note}>
            Các tháng không có file FC trong nguồn thì đường hoàn thành bỏ trống
            — không vẽ 0% để tránh đọc thành hụt chỉ tiêu.
          </p>
        )}
      </ChartCard>

      <ChartCard
        title="GTTC Volume"
        note="Cột: sản lượng GTTC · Đường: mức hoàn thành so AOP tháng"
        legend={<Legend scope={scope} stacked={stacked} target="AOP" />}
      >
        <VolumeChart
          months={BIZ_MONTHS}
          bars={gtcBars}
          lines={gtcLines}
          ariaLabel={`Sản lượng GTTC và mức hoàn thành AOP của ${SCOPE_LABEL[scope]}`}
        />
      </ChartCard>

      <ChartCard title="Tỷ trọng theo lane" note="Theo sản lượng Created">
        <LaneShareTable scope={scope} />
      </ChartCard>

      {stacked && (
        <ChartCard
          title="Sản lượng theo nhóm trọng lượng"
          note="Theo sản lượng Created"
        >
          <BandShareTable scope={scope} />
        </ChartCard>
      )}
    </div>
  );
}

function ChartCard({
  title,
  note,
  legend,
  children,
}: {
  title: string;
  note: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h4>{title}</h4>
        {legend}
      </div>
      <p className={styles.cardNote}>{note}</p>
      {children}
    </div>
  );
}

function Legend({
  scope,
  stacked,
  target,
}: {
  scope: DataScope;
  stacked: boolean;
  target: "FC" | "AOP";
}) {
  return (
    <div className={styles.legend}>
      {stacked ? (
        WEIGHT_ORDER.map((band) => (
          <span key={band}>
            <i
              className={band === "<15kg" ? styles.swLow : styles.swHigh}
            />
            {bandLabel(band, scope)}
          </span>
        ))
      ) : (
        <span>
          <i className={styles.swPrimary} />
          Sản lượng
        </span>
      )}
      <span>
        <i className={styles.lnTotal} />
        Tổng vs {target}
      </span>
      {stacked && (
        <span>
          <i className={styles.lnDashed} />
          Theo block weight
        </span>
      )}
    </div>
  );
}

function LaneShareTable({ scope }: { scope: DataScope }) {
  const rows = laneShareByMonth(scope);
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Tháng</th>
            {LANE_ORDER.map((lane) => (
              <th key={lane} scope="col">
                {lane}
              </th>
            ))}
            <th scope="col">Tổng Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">{formatMonthShort(row.month)}</th>
              {row.shares.map((cell) => (
                <td key={cell.lane}>{formatPercent(cell.share)}</td>
              ))}
              <td className={styles.strong}>
                {formatNumber(row.totalCreated)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BandShareTable({ scope }: { scope: DataScope }) {
  const rows = bandShareByMonth(scope);
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" rowSpan={2}>
              Tháng
            </th>
            {WEIGHT_ORDER.map((band) => (
              <th key={band} scope="col" colSpan={2}>
                {bandLabel(band, scope)}
              </th>
            ))}
          </tr>
          <tr>
            {WEIGHT_ORDER.map((band) => [
              <th key={`${band}-v`} scope="col">
                Sản lượng
              </th>,
              <th key={`${band}-s`} scope="col">
                Tỷ trọng
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">{formatMonthShort(row.month)}</th>
              {row.cells.map((cell) => [
                <td key={`${cell.band}-v`}>{formatNumber(cell.created)}</td>,
                <td key={`${cell.band}-s`}>{formatPercent(cell.share)}</td>,
              ])}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------- Chú thích nguồn, đặt cuối trang ---------------------- */

export function BizFootnote() {
  return (
    <p className={styles.footnote}>
      Nguồn:{" "}
      <a href={BIZ_SOURCE_URL} target="_blank" rel="noopener noreferrer">
        tower control raw · raw tab 1 ↗
      </a>{" "}
      · snapshot {BIZ_SNAPSHOT_AT}. Số liệu chốt tới <b>{SNAPSHOT_LABEL}</b> nên{" "}
      {formatMonth(LATEST_MONTH)} chưa đủ tháng — sản lượng MTD và mức hoàn
      thành của tháng này đều thấp hơn thực tế. FC đối chiếu với Created, AOP
      đối chiếu với GTTC.
    </p>
  );
}
