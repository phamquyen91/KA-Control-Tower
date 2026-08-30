"use client";

import { formatCompact, formatMonthShort, formatNumber } from "@/lib/bizMetrics";
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
  /** Mỗi tháng một mảng segment; nhiều segment thì cột xếp chồng. */
  bars: BarSegment[][];
  lines: LineSeries[];
  ariaLabel: string;
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
}: VolumeChartProps) {
  const stackTotals = bars.map((segs) => segs.reduce((a, s) => a + s.value, 0));
  const topLeft = niceCeil(Math.max(...stackTotals, 0));

  // Trục phải cho % hoàn thành. Cố định 0–150% để các chart so được với nhau
  // và mốc 100% luôn nằm cùng một chỗ.
  const topRight = 1.5;

  const groupW = PLOT_W / months.length;
  const barW = Math.min(34, groupW - 18);

  const yLeft = (v: number) => PAD.top + PLOT_H - (v / topLeft) * PLOT_H;
  const yRight = (v: number) => PAD.top + PLOT_H - (v / topRight) * PLOT_H;
  const xCenter = (i: number) => PAD.left + i * groupW + groupW / 2;

  const leftTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * topLeft);
  const rightTicks = [0, 0.5, 1, 1.5];

  return (
    <div className={styles.scroll}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
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
          đạt 100%
        </text>

        {bars.map((segs, i) => {
          let cursor = 0;
          return (
            <g key={months[i]}>
              {segs.map((seg) => {
                const y0 = yLeft(cursor);
                cursor += seg.value;
                const y1 = yLeft(cursor);
                return (
                  <rect
                    key={seg.key}
                    x={xCenter(i) - barW / 2}
                    y={y1}
                    width={barW}
                    height={Math.max(0, y0 - y1)}
                    className={seg.className}
                  >
                    <title>{`${formatMonthShort(months[i])} · ${seg.label}: ${formatNumber(seg.value)}`}</title>
                  </rect>
                );
              })}
              <text
                x={xCenter(i)}
                y={HEIGHT - 12}
                textAnchor="middle"
                className={styles.axisLabel}
              >
                {formatMonthShort(months[i])}
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
                  fill="none"
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
                    r={3}
                    className={`${styles.dot} ${line.className}`}
                  >
                    <title>{`${formatMonthShort(months[i])} · ${line.label}: ${(v * 100).toFixed(1).replace(".", ",")}%`}</title>
                  </circle>
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
      </svg>
    </div>
  );
}
