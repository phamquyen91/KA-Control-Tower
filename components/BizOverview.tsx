"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import {
  BIZ_SNAPSHOT_AT,
  BIZ_SOURCE_URL,
  LANE_ORDER,
  SCOPE_LABEL,
  WEIGHT_ORDER,
  bandLabel,
} from "@/lib/labels";
import {
  formatMonth,
  formatMonthShort,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import type { BizPayload, ScopePayload } from "@/lib/bizViewModel";
import type { DataScope } from "@/lib/tabs";
import VolumeChart, { type BarSegment, type LineSeries } from "./VolumeChart";
import chart from "./VolumeChart.module.css";
import styles from "./BizOverview.module.css";

// Snapshot chốt giữa tháng 8 nên tháng cuối khuyết ngày — mọi con số MTD và
// mức hoàn thành của tháng đó đều thấp hơn thực tế.
const SNAPSHOT_LABEL = "19/08/2026";

type LoadState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden"; email?: string }
  | { status: "error"; message: string }
  | { status: "ready"; payload: BizPayload };

export default function BizOverview() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    // Số liệu không nằm sẵn trong bundle: phải hỏi /api/biz, nơi kiểm tra
    // đăng nhập và allowlist trước khi trả về.
    fetch("/api/biz")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) return setState({ status: "unauthenticated" });
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          return setState({ status: "forbidden", email: body?.email });
        }
        if (!res.ok) {
          return setState({
            status: "error",
            message: `Máy chủ trả lỗi ${res.status}.`,
          });
        }
        setState({ status: "ready", payload: (await res.json()) as BizPayload });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Không gọi được API.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") return <Gate variant="loading" />;
  if (state.status === "unauthenticated") return <Gate variant="signin" />;
  if (state.status === "forbidden")
    return <Gate variant="forbidden" email={state.email} />;
  if (state.status === "error")
    return <Gate variant="error" message={state.message} />;

  const { payload } = state;
  const latestMonth = payload.months[payload.months.length - 1];

  return (
    <div className={styles.page}>
      <Section
        title="Tổng quan"
        subtitle={`GTTC so với AOP · ${formatMonth(latestMonth)}`}
      >
        <div className={styles.overviewGrid}>
          <ProgressPanel
            scope="SPB"
            data={payload.scopes.SPB}
            months={payload.months}
          />
          <ProgressPanel
            scope="SPE"
            data={payload.scopes.SPE}
            months={payload.months}
          />
        </div>
      </Section>

      <Section title="Sản lượng tháng" subtitle="Created so FC · GTTC so AOP">
        <div className={styles.matrix}>
          <ScopeHeading scope="SPB" />
          <ScopeHeading scope="SPE" />

          <ChartRow kind="created" payload={payload} />
          <ChartRow kind="gtc" payload={payload} />
          <ChartRow kind="lane" payload={payload} />
          <ChartRow kind="band" payload={payload} />
        </div>
      </Section>

      <p className={styles.footnote}>
        Nguồn:{" "}
        <a href={BIZ_SOURCE_URL} target="_blank" rel="noopener noreferrer">
          tower control raw · raw tab 1 ↗
        </a>{" "}
        · snapshot {BIZ_SNAPSHOT_AT}. Số liệu chốt tới <b>{SNAPSHOT_LABEL}</b>{" "}
        nên {formatMonth(latestMonth)} chưa đủ tháng — sản lượng MTD và mức hoàn
        thành của tháng này đều thấp hơn thực tế. FC đối chiếu với Created, AOP
        đối chiếu với GTTC.
      </p>
    </div>
  );
}

/* ------------------------- Cổng kiểm soát truy cập ------------------------- */

function Gate({
  variant,
  email,
  message,
}: {
  variant: "loading" | "signin" | "forbidden" | "error";
  email?: string;
  message?: string;
}) {
  if (variant === "loading") {
    return (
      <div className={styles.gate} role="status" aria-live="polite">
        <div className={styles.gateSpinner} />
        <p className={styles.gateText}>Đang tải số liệu…</p>
      </div>
    );
  }

  if (variant === "signin") {
    return (
      <div className={styles.gate}>
        <h2 className={styles.gateTitle}>Cần đăng nhập</h2>
        <p className={styles.gateText}>
          Tab này chứa số liệu kinh doanh nên chỉ mở cho một số tài khoản
          @ghn.vn được cấp quyền riêng. Đăng nhập để xem.
        </p>
        <button
          type="button"
          className={styles.gateBtn}
          onClick={() => signIn("google")}
        >
          Đăng nhập bằng Google
        </button>
      </div>
    );
  }

  if (variant === "forbidden") {
    return (
      <div className={styles.gate}>
        <h2 className={styles.gateTitle}>Tài khoản chưa được cấp quyền</h2>
        <p className={styles.gateText}>
          {email ? (
            <>
              Tài khoản <code>{email}</code> vào được Control Tower nhưng không
              nằm trong danh sách được xem tab này.
            </>
          ) : (
            "Tài khoản đang đăng nhập không nằm trong danh sách được xem tab này."
          )}{" "}
          Liên hệ người quản trị Control Tower để được bổ sung.
        </p>
        <button
          type="button"
          className={styles.gateBtnGhost}
          onClick={() => signIn("google")}
        >
          Đăng nhập bằng tài khoản khác
        </button>
      </div>
    );
  }

  return (
    <div className={styles.gate}>
      <h2 className={styles.gateTitle}>Không tải được số liệu</h2>
      <p className={styles.gateText}>{message}</p>
    </div>
  );
}

/* --------------------------------- Khung --------------------------------- */

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

/* -------------------------------- Phần 1 --------------------------------- */

function ProgressPanel({
  scope,
  data,
  months,
}: {
  scope: DataScope;
  data: ScopePayload;
  months: string[];
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelBar} />
        <h3>{SCOPE_LABEL[scope]}</h3>
      </div>
      <div className={styles.statRow}>
        <StatCard
          title="GTTC YTD"
          stat={data.progress.ytd}
          spark={data.progress.spark}
          months={months}
        />
        <StatCard
          title="GTTC MTD"
          stat={data.progress.mtd}
          spark={data.progress.spark}
          months={months}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  stat,
  spark,
  months,
}: {
  title: string;
  stat: ScopePayload["progress"]["ytd"];
  spark: number[];
  months: string[];
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
      <Sparkline values={spark} months={months} ok={ok} />
      <div className={styles.statFoot}>
        AOP cùng kỳ: {formatNumber(stat.target)}
      </div>
    </div>
  );
}

function Sparkline({
  values,
  months,
  ok,
}: {
  values: number[];
  months: string[];
  ok: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  const w = 200;
  const h = 34;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const x = (i: number) => i * step;
  const y = (v: number) => h - (v / max) * (h - 4) - 2;
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");

  return (
    <div className={styles.sparkWrap}>
      <svg
        className={styles.spark}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onPointerLeave={() => setActive(null)}
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

        {active !== null && (
          // Vạch dọc chứ không phải chấm tròn: svg này kéo giãn theo chiều
          // ngang (preserveAspectRatio="none") nên hình tròn sẽ méo thành bầu
          // dục, còn vạch dọc thì không.
          <line
            x1={x(active)}
            x2={x(active)}
            y1={0}
            y2={h}
            className={styles.sparkMarker}
          />
        )}

        {values.map((value, i) => (
          <rect
            key={months[i] ?? i}
            x={x(i) - step / 2}
            y={0}
            width={step}
            height={h}
            className={styles.sparkHit}
            tabIndex={0}
            role="button"
            aria-label={`${formatMonth(months[i])}: ${formatNumber(value)}`}
            onPointerEnter={() => setActive(i)}
            onPointerDown={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        ))}
      </svg>

      {active !== null && (
        <div
          className={styles.sparkTip}
          style={{ left: `${(x(active) / w) * 100}%` }}
          role="status"
        >
          <b>{formatMonthShort(months[active])}</b>{" "}
          {formatNumber(values[active])}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Phần 2 --------------------------------- */

function ScopeHeading({ scope }: { scope: DataScope }) {
  return (
    <div className={styles.panelHead}>
      <span className={styles.panelBar} />
      <h3>{SCOPE_LABEL[scope]}</h3>
    </div>
  );
}

type RowKind = "created" | "gtc" | "lane" | "band";

/**
 * Một hàng của lưới = cùng một loại nội dung cho cả hai scope, đặt cạnh nhau để
 * so trực tiếp. Ô nào không áp dụng (Standard không tách block weight) thì để
 * trống chứ không dồn hàng, nếu không các hàng dưới sẽ lệch nhau.
 */
function ChartRow({ kind, payload }: { kind: RowKind; payload: BizPayload }) {
  return (
    <>
      <ScopeCell scope="SPB" kind={kind} data={payload.scopes.SPB} months={payload.months} />
      <ScopeCell scope="SPE" kind={kind} data={payload.scopes.SPE} months={payload.months} />
    </>
  );
}

function ScopeCell({
  scope,
  kind,
  data,
  months,
}: {
  scope: DataScope;
  kind: RowKind;
  data: ScopePayload;
  months: string[];
}) {
  const stacked = scope === "SPB";

  if (kind === "band" && !stacked) return <div aria-hidden="true" />;

  if (kind === "lane") {
    return (
      <ChartCard
        scope={scope}
        title="Tỷ trọng theo lane"
        note="Theo sản lượng Created"
      >
        <LaneShareTable rows={data.laneShare} />
      </ChartCard>
    );
  }

  if (kind === "band") {
    return (
      <ChartCard
        scope={scope}
        title="Sản lượng theo nhóm trọng lượng"
        note="Theo sản lượng Created"
      >
        <BandShareTable rows={data.bandShare} scope={scope} />
      </ChartCard>
    );
  }

  const isCreated = kind === "created";
  const target = isCreated ? "FC" : "AOP";
  // Created dùng bộ lạnh, GTTC dùng bộ cam — nhìn màu là biết đang xem loại nào.
  const lowClass = isCreated ? chart.barLow : chart.barLowWarm;
  const highClass = isCreated ? chart.barHigh : chart.barHighWarm;

  const bars: BarSegment[][] = data.points.map((p) =>
    stacked
      ? p.bands.map((b) => ({
          key: b.band,
          label: bandLabel(b.band, scope),
          value: isCreated ? b.created : b.gtc,
          className: b.band === "<15kg" ? lowClass : highClass,
        }))
      : [
          {
            key: "total",
            label: isCreated ? "Created" : "GTTC",
            value: isCreated ? p.created : p.gtc,
            className: isCreated ? chart.barPrimary : chart.barSecondary,
          },
        ],
  );

  const lines: LineSeries[] = [
    {
      key: `${target}-total`,
      label: `Tổng vs ${target}`,
      dashed: false,
      className: chart.lineTotal,
      values: data.points.map((p) => (isCreated ? p.fcTotal : p.aopTotal)),
    },
    ...(stacked
      ? WEIGHT_ORDER.map((band) => ({
          key: `${target}-${band}`,
          label: `${bandLabel(band, scope)} vs ${target}`,
          dashed: true,
          className: band === "<15kg" ? chart.lineLow : chart.lineHigh,
          values: data.points.map((p) =>
            isCreated ? (p.fcByBand[band] ?? null) : (p.aopByBand[band] ?? null),
          ),
        }))
      : []),
  ];

  return (
    <ChartCard
      scope={scope}
      title={isCreated ? "Created Volume" : "GTTC Volume"}
      note={`Cột: sản lượng ${isCreated ? "Created" : "GTTC"} · Đường: mức hoàn thành so ${target} tháng`}
      legend={
        <Legend
          scope={scope}
          stacked={stacked}
          target={target}
          warm={!isCreated}
        />
      }
    >
      <VolumeChart
        months={months}
        bars={bars}
        lines={lines}
        ariaLabel={`Sản lượng ${isCreated ? "Created" : "GTTC"} và mức hoàn thành ${target} của ${SCOPE_LABEL[scope]}`}
      />
    </ChartCard>
  );
}

function ChartCard({
  scope,
  title,
  note,
  legend,
  children,
}: {
  scope: DataScope;
  title: string;
  note: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h4>
          {/* Khi lưới xuống 1 cột, tiêu đề cột biến mất nên phải gắn tên
              client vào từng thẻ, nếu không sẽ không biết đang xem bên nào. */}
          <span className={styles.cardScope}>{SCOPE_LABEL[scope]} · </span>
          {title}
        </h4>
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
  warm,
}: {
  scope: DataScope;
  stacked: boolean;
  target: "FC" | "AOP";
  /** true = chart GTTC, dùng bộ màu cam cho ô chú giải. */
  warm: boolean;
}) {
  return (
    <div className={styles.legend}>
      {stacked ? (
        WEIGHT_ORDER.map((band) => (
          <span key={band}>
            <i
              className={
                band === "<15kg"
                  ? warm
                    ? styles.swLowWarm
                    : styles.swLow
                  : warm
                    ? styles.swHighWarm
                    : styles.swHigh
              }
            />
            {bandLabel(band, scope)}
          </span>
        ))
      ) : (
        <span>
          <i className={warm ? styles.swHighWarm : styles.swPrimary} />
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

function LaneShareTable({ rows }: { rows: ScopePayload["laneShare"] }) {
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
            <th scope="col">Tổng</th>
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

function BandShareTable({
  rows,
  scope,
}: {
  rows: ScopePayload["bandShare"];
  scope: DataScope;
}) {
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
