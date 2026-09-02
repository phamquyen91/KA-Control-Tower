"use client";

import { useState } from "react";
import {
  formatCompact,
  formatMonthShort,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import styles from "./VolumeChart.module.css";

export interface BarSegment {
  key: string;
  label: string;
  value: number;
  /** Lớp CSS quyết định màu — truyền từ component cha để giữ bảng màu tập trung. */
  className: string;
}

export interface LineSeries {
  key: string;
  label: string;
  /** null = tháng đó không có mục tiêu để so; đoạn line sẽ đứt quãng ở đó. */
  values: (number | null)[];
  dashed: boolean;
  className: string;
}

export interface VolumeChartProps {
  months: string[];
  /** Mỗi mốc một mảng segment. Mặc định xếp chồng; `grouped` thì đứng cạnh nhau. */
  bars: BarSegment[][];
  lines: LineSeries[];
  ariaLabel: string;
  /** true = cột đứng cạnh nhau, dùng khi so hai đại lượng độc lập (D0 và D+1). */
  grouped?: boolean;
  /** Nhãn cho vạch tham chiếu ở trục phải. */
  rightAxisLabel?: string;
  /** Nhãn trục X; mặc định coi mốc là tháng và rút gọn thành T1, T2... */
  formatTick?: (value: string) => string;
}

const WIDTH = 720;
const HEIGHT = 320;
const PAD = { top: 18, right: 52, bottom: 36, left: 58 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/** Trần trục trái làm tròn lên để nhãn ra số đẹp. */
function niceCeil(max: number) {
  if (max <= 0) return 1;
  const step = Math.pow(10, Math.floor(Math.log10(max))) / 2;
  return Math.ceil(max / step) * step;
}

export default function VolumeChart({
  months,
  bars,
  lines,
  ariaLabel,
  grouped = false,
  rightAxisLabel = "đạt 100%",
  formatTick = formatMonthShort,
}: VolumeChartProps) {
  // Tháng đang được trỏ/chạm/focus. null = không hiện tooltip.
  const [active, setActive] = useState<number | null>(null);

  const stackTotals = bars.map((segs) => segs.reduce((a, s) => a + s.value, 0));
  // Cột nhóm thì mỗi cột đứng riêng nên trần lấy giá trị lớn nhất, không lấy tổng.
  const peak = grouped
    ? Math.max(...bars.flatMap((segs) => segs.map((seg) => seg.value)), 0)
    : Math.max(...stackTotals, 0);
  const topLeft = niceCeil(peak);

  // Trục phải cho % hoàn thành. Cố định 0–150% để các chart so được với nhau
  // và mốc 100% luôn nằm cùng một chỗ.
  const topRight = 1.5;

  const groupW = PLOT_W / months.length;
  const maxSegs = Math.max(1, ...bars.map((b) => b.length));
  const barW = grouped
    ? Math.min(30, (groupW - 22) / maxSegs)
    : Math.min(34, groupW - 18);

  const yLeft = (v: number) => PAD.top + PLOT_H - (v / topLeft) * PLOT_H;
  const yRight = (v: number) => PAD.top + PLOT_H - (v / topRight) * PLOT_H;
  const xCenter = (i: number) => PAD.left + i * groupW + groupW / 2;

  const leftTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * topLeft);
  // Không có đường nào thì trục phải và vạch tham chiếu chỉ là nhiễu.
  const hasLines = lines.length > 0;
  const rightTicks = hasLines ? [0, 0.5, 1, 1.5] : [];

  const stacked = !grouped && bars.some((segs) => segs.length > 1);

  return (
    <div className={styles.scroll}>
      <div className={styles.frame}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={ariaLabel}
          onPointerLeave={() => setActive(null)}
        >
          {leftTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={yLeft(tick)}
                y2={yLeft(tick)}
                className={styles.grid}
              />
              <text
                x={PAD.left - 8}
                y={yLeft(tick) + 4}
                textAnchor="end"
                className={styles.axisLabel}
              >
                {formatCompact(tick)}
              </text>
            </g>
          ))}

          {rightTicks.map((tick) => (
            <text
              key={tick}
              x={WIDTH - PAD.right + 8}
              y={yRight(tick) + 4}
              textAnchor="start"
              className={styles.axisLabel}
            >
              {Math.round(tick * 100)}%
            </text>
          ))}

          {/* Mốc 100% — vạch tham chiếu cho các đường hoàn thành. */}
          {hasLines && (
            <>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={yRight(1)}
                y2={yRight(1)}
                className={styles.target}
              />
              <text
                x={WIDTH - PAD.right + 8}
                y={yRight(1) - 6}
                className={styles.targetLabel}
              >
                {rightAxisLabel}
              </text>
            </>
          )}

          {active !== null && (
            <rect
              x={PAD.left + active * groupW}
              y={PAD.top}
              width={groupW}
              height={PLOT_H}
              className={styles.activeBand}
            />
          )}

          {bars.map((segs, i) => {
            let cursor = 0;
            const groupStart =
              xCenter(i) - (barW * segs.length + 4 * (segs.length - 1)) / 2;
            return (
              <g key={months[i]}>
                {segs.map((seg, si) => {
                  // Chồng: mỗi segment nối tiếp segment trước.
                  // Nhóm: mỗi segment là một cột riêng, đều bắt đầu từ đáy.
                  const x = grouped
                    ? groupStart + si * (barW + 4)
                    : xCenter(i) - barW / 2;
                  const y0 = grouped ? yLeft(0) : yLeft(cursor);
                  if (!grouped) cursor += seg.value;
                  const y1 = grouped ? yLeft(seg.value) : yLeft(cursor);
                  return (
                    <rect
                      key={seg.key}
                      x={x}
                      y={y1}
                      width={barW}
                      height={Math.max(0, y0 - y1)}
                      className={seg.className}
                    />
                  );
                })}
                <text
                  x={xCenter(i)}
                  y={HEIGHT - 12}
                  textAnchor="middle"
                  className={
                    active === i ? styles.axisLabelActive : styles.axisLabel
                  }
                >
                  {formatTick(months[i])}
                </text>
              </g>
            );
          })}

          {lines.map((line) => {
            // Ngắt path ở những tháng không có mục tiêu, thay vì nối thẳng qua.
            const segments: string[] = [];
            let current: string[] = [];
            line.values.forEach((v, i) => {
              if (v === null) {
                if (current.length) segments.push(current.join(" "));
                current = [];
                return;
              }
              current.push(
                `${current.length ? "L" : "M"}${xCenter(i)},${yRight(Math.min(v, topRight))}`,
              );
            });
            if (current.length) segments.push(current.join(" "));

            return (
              <g key={line.key}>
                {segments.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    className={`${styles.line} ${line.className}`}
                    strokeDasharray={line.dashed ? "5 4" : undefined}
                  />
                ))}
                {line.values.map((v, i) =>
                  v === null ? null : (
                    <circle
                      key={i}
                      cx={xCenter(i)}
                      cy={yRight(Math.min(v, topRight))}
                      r={active === i ? 5 : 3}
                      className={`${styles.dot} ${line.className}`}
                    />
                  ),
                )}
              </g>
            );
          })}

          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={PAD.top + PLOT_H}
            y2={PAD.top + PLOT_H}
            className={styles.axis}
          />

          {/* Vùng bắt sự kiện: cả cột tháng, dễ trúng hơn nhiều so với việc
              phải chạm đúng vào cột hay đúng vào chấm trên đường. */}
          {months.map((month, i) => (
            <rect
              key={`hit-${month}`}
              x={PAD.left + i * groupW}
              y={PAD.top}
              width={groupW}
              height={PLOT_H}
              className={styles.hit}
              tabIndex={0}
              role="button"
              aria-label={`Xem số liệu ${formatTick(month)}`}
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          ))}
        </svg>

        {active !== null && (
          <div
            className={styles.tooltip}
            style={{
              left: `${((PAD.left + active * groupW + groupW / 2) / WIDTH) * 100}%`,
            }}
            role="status"
          >
            <div className={styles.tipTitle}>{formatTick(months[active])}</div>

            {bars[active].map((seg) => (
              <div key={seg.key} className={styles.tipRow}>
                <span className={styles.tipKey}>
                  <i className={`${styles.tipSwatch} ${seg.className}`} />
                  {seg.label}
                </span>
                <b>{formatNumber(seg.value)}</b>
              </div>
            ))}

            {stacked && (
              <div className={`${styles.tipRow} ${styles.tipTotal}`}>
                <span className={styles.tipKey}>Tổng</span>
                <b>{formatNumber(stackTotals[active])}</b>
              </div>
            )}

            {lines.map((line) => (
              <div key={line.key} className={styles.tipRow}>
                <span className={styles.tipKey}>
                  <i
                    className={`${styles.tipDash} ${line.className}`}
                    data-dashed={line.dashed || undefined}
                  />
                  {line.label}
                </span>
                <b>
                  {line.values[active] === null
                    ? "—"
                    : formatPercent(line.values[active] as number)}
                </b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
