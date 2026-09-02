"use client";

import { useEffect, useState } from "react";
import { SCOPE_LABEL } from "@/lib/labels";
import { formatNumber, formatPercent, formatPp } from "@/lib/format";
import type { Direction } from "@/lib/campaignData";
import type { CampaignPayload } from "@/lib/campaignViewModel";
import type { DataScope } from "@/lib/tabs";
import VolumeChart, {
  type BarSegment,
  type LineSeries,
} from "./VolumeChart";
import LineChart, { type ChartLine } from "./LineChart";
import chart from "./VolumeChart.module.css";
import styles from "./CampaignOverview.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: CampaignPayload };

export default function CampaignOverview() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
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
        setState({
          status: "ready",
          payload: (await res.json()) as CampaignPayload,
        });
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

  return (
    <div className={styles.page}>
      <Section title="Tổng quan" subtitle="Sản lượng và ODR qua các kỳ campaign">
        <div className={styles.matrix}>
          <ScopeHeading scope="SPB" />
          <ScopeHeading scope="SPE" />

          <VolumeCard scope="SPB" payload={payload} />
          <VolumeCard scope="SPE" payload={payload} />

          <OdrCard scope="SPB" payload={payload} />
          <OdrCard scope="SPE" payload={payload} />
        </div>
      </Section>

      <Section title="Insight" subtitle="Bóc tách theo kỳ, đội giao và tỉnh">
        <div className={styles.matrix}>
          <ScopeHeading scope="SPB" />
          <ScopeHeading scope="SPE" />

          <PeriodCard scope="SPB" payload={payload} />
          <PeriodCard scope="SPE" payload={payload} />

          {/* Standard gần như toàn bộ do GHN giao nên bảng đội giao chỉ có ý
              nghĩa với Bulky; ô bên phải để trống cho các hàng dưới khỏi lệch. */}
          <TeamCard scope="SPB" payload={payload} />
          <div aria-hidden="true" />

          <ProvinceCard scope="SPB" payload={payload} direction="from" />
          <ProvinceCard scope="SPE" payload={payload} direction="from" />

          <ProvinceCard scope="SPB" payload={payload} direction="to" />
          <ProvinceCard scope="SPE" payload={payload} direction="to" />
        </div>
      </Section>

      <p className={styles.footnote}>
        Nguồn:{" "}
        <a href={payload.sourceUrl} target="_blank" rel="noopener noreferrer">
          tower control raw · tab DD ↗
        </a>{" "}
        · snapshot {payload.snapshotAt}. Sản lượng là số đơn trong mẫu đối soát,
        không phải toàn bộ sản lượng. FC lấy đúng cột ngày campaign trong file
        forecast tháng của Shopee. ODR tính lại theo trọng số đơn, không lấy
        trung bình cộng ODR các tỉnh. Dữ liệu ngày thường chỉ có ở D0 nên so
        sánh với ngày thường luôn là CP D0 ↔ baseline D0.
      </p>
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

function ScopeHeading({ scope }: { scope: DataScope }) {
  return (
    <div className={styles.panelHead}>
      <span className={styles.panelBar} />
      <h3>{SCOPE_LABEL[scope]}</h3>
    </div>
  );
}

function Card({
  scope,
  title,
  note,
  legend,
  children,
}: {
  scope: DataScope;
  title: string;
  note?: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h4>
          <span className={styles.cardScope}>{SCOPE_LABEL[scope]} · </span>
          {title}
        </h4>
        {legend}
      </div>
      {note && <p className={styles.cardNote}>{note}</p>}
      {children}
    </div>
  );
}

/* ------------------------------- Tổng quan ------------------------------- */

function VolumeCard({
  scope,
  payload,
}: {
  scope: DataScope;
  payload: CampaignPayload;
}) {
  const data = payload.scopes[scope];
  const bars: BarSegment[][] = data.rows.map((r) => [
    {
      key: "d0",
      label: "Ngày D",
      value: r.cpD0.orders,
      className: chart.barPrimary,
    },
    {
      key: "d1",
      label: "Ngày D+1",
      value: r.cpD1.orders,
      className: chart.barSecondary,
    },
  ]);

  const lines: LineSeries[] = [
    {
      key: "fc-d0",
      label: "Ngày D vs FC",
      dashed: false,
      className: chart.lineD0,
      values: data.rows.map((r) => r.fcD0),
    },
    {
      key: "fc-d1",
      label: "Ngày D+1 vs FC",
      dashed: true,
      className: chart.lineD1,
      values: data.rows.map((r) => r.fcD1),
    },
  ];

  return (
    <Card
      scope={scope}
      title="Sản lượng ngày D và D+1"
      note="Cột: sản lượng từng ngày · Đường: mức hoàn thành so FC của chính ngày đó"
      legend={
        <div className={styles.legend}>
          <span>
            <i className={styles.swD0} />
            Ngày D
          </span>
          <span>
            <i className={styles.swD1} />
            Ngày D+1
          </span>
          <span>
            <i className={styles.lnD0} />
            D vs FC
          </span>
          <span>
            <i className={styles.lnD1} />
            D+1 vs FC
          </span>
        </div>
      }
    >
      <VolumeChart
        months={payload.campaigns}
        bars={bars}
        lines={lines}
        grouped
        formatTick={(c) => c}
        ariaLabel={`Sản lượng và mức hoàn thành FC ngày D, D+1 của ${SCOPE_LABEL[scope]}`}
      />
    </Card>
  );
}

function OdrCard({
  scope,
  payload,
}: {
  scope: DataScope;
  payload: CampaignPayload;
}) {
  const data = payload.scopes[scope];
  const lines: ChartLine[] = [
    {
      key: "d0",
      label: "ODR ngày D",
      dashed: false,
      className: chart.lineD0,
      values: data.rows.map((r) => r.cpD0.odr),
    },
    {
      key: "d1",
      label: "ODR ngày D+1",
      dashed: true,
      className: chart.lineD1,
      values: data.rows.map((r) => r.cpD1.odr),
    },
    {
      key: "base",
      label: "ODR ngày thường",
      dashed: false,
      className: chart.lineBase,
      values: data.rows.map((r) => r.baselineD0.odr),
    },
  ];

  return (
    <Card
      scope={scope}
      title="ODR qua các kỳ"
      note="Tỷ lệ giao đúng hạn, so ngày D với D+1 và ngày thường"
      legend={
        <div className={styles.legend}>
          <span>
            <i className={styles.lnD0} />
            Ngày D
          </span>
          <span>
            <i className={styles.lnD1} />
            Ngày D+1
          </span>
          <span>
            <i className={styles.lnBase} />
            Ngày thường
          </span>
        </div>
      }
    >
      <LineChart
        ticks={payload.campaigns}
        lines={lines}
        ariaLabel={`ODR các kỳ campaign của ${SCOPE_LABEL[scope]}`}
      />
    </Card>
  );
}

/* --------------------------------- Insight -------------------------------- */

function PeriodCard({
  scope,
  payload,
}: {
  scope: DataScope;
  payload: CampaignPayload;
}) {
  const rows = payload.scopes[scope].rows;
  return (
    <Card scope={scope} title="Thống kê theo kỳ campaign">
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Kỳ</th>
              <th scope="col">Đơn ngày D</th>
              <th scope="col">Đơn ngày D+1</th>
              <th scope="col">ODR ngày D</th>
              <th scope="col">vs ngày thường</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.campaign}>
                <th scope="row">{r.campaign}</th>
                <td>{formatNumber(r.cpD0.orders)}</td>
                <td>{formatNumber(r.cpD1.orders)}</td>
                <td>{formatPercent(r.cpD0.odr)}</td>
                <td className={r.deltaD0Pp >= 0 ? styles.up : styles.down}>
                  {formatPp(r.deltaD0Pp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.pending}>
        <b>Thiếu dữ liệu:</b> chưa có cột &ldquo;gấp bao nhiêu lần ngày
        thường&rdquo;. Số baseline trong nguồn là <b>tổng nhiều ngày</b> chứ
        không phải một ngày, nên chia thẳng sẽ ra dưới 1 lần và bị đọc thành
        campaign thấp hơn ngày thường. Cần biết baseline gộp bao nhiêu ngày mới
        quy về mức mỗi ngày được. Cột &ldquo;vs ngày thường&rdquo; ở trên là
        chênh lệch <b>ODR</b>, không phải sản lượng.
      </p>
    </Card>
  );
}

function TeamCard({
  scope,
  payload,
}: {
  scope: DataScope;
  payload: CampaignPayload;
}) {
  const rows = payload.scopes[scope].teams;
  return (
    <Card
      scope={scope}
      title="Sản lượng theo đội giao"
      note="Đơn ngày D, tách theo đội thực hiện giao"
    >
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>
                Kỳ
              </th>
              <th scope="col" colSpan={2}>
                AHM
              </th>
              <th scope="col" colSpan={2}>
                GHN
              </th>
            </tr>
            <tr>
              <th scope="col">Sản lượng</th>
              <th scope="col">Tỷ trọng</th>
              <th scope="col">Sản lượng</th>
              <th scope="col">Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.campaign}>
                <th scope="row">{r.campaign}</th>
                {r.cells.map((c) => [
                  <td key={`${c.team}-v`}>{formatNumber(c.orders)}</td>,
                  <td key={`${c.team}-s`}>{formatPercent(c.share)}</td>,
                ])}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ProvinceCard({
  scope,
  payload,
  direction,
}: {
  scope: DataScope;
  payload: CampaignPayload;
  direction: Direction;
}) {
  const latest = payload.latestCampaign;
  const rows = payload.scopes[scope].topProvinces[latest]?.[direction] ?? [];
  const isPickup = direction === "from";

  return (
    <Card
      scope={scope}
      title={`Top ${payload.topLimit} tỉnh ${isPickup ? "lấy" : "giao"} — ${latest}`}
      note={`Xếp theo sản lượng ngày D, chiều ${isPickup ? "tỉnh lấy hàng" : "tỉnh giao hàng"}`}
    >
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Tỉnh</th>
              <th scope="col">Sản lượng</th>
              {!isPickup && <th scope="col">ODR</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.province}>
                <th scope="row">{r.province}</th>
                <td>{formatNumber(r.orders)}</td>
                {!isPickup && <td>{formatPercent(r.odr)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isPickup && (
        <p className={styles.pending}>
          <b>Thiếu dữ liệu:</b> chưa có cột OPR. Tab <code>DD</code> chỉ có{" "}
          <code>ontime_deli_odr_count</code> — là số liệu <b>giao</b>, không
          phải <b>lấy</b>. Lấy ODR dùng thay sẽ sai bản chất nên để trống.
        </p>
      )}
    </Card>
  );
}
