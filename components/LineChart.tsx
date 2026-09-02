"use client";

import { useState } from "react";
import { formatPercent } from "@/lib/format";
import styles from "./VolumeChart.module.css";

export interface ChartLine {
  key: string;
  label: string;
  /** null = mốc đó không có số liệu; đường sẽ đứt quãng ở đấy. */
  values: (number | null)[];
  dashed: boolean;
  className: string;
}

export interface LineChartProps {
  ticks: string[];
  lines: ChartLine[];
  ariaLabel: string;
  /** Chặn dưới của trục. ODR nằm trong dải hẹp nên cắt từ 0.6 mới thấy chênh lệch. */
  floor?: number;
}

const WIDTH = 720;
const HEIGHT = 300;
const PAD = { top: 18, right: 20, bottom: 36, left: 52 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

export default function LineChart({
  ticks,
  lines,
  ariaLabel,
  floor = 0.6,
}: LineChartProps) {
  const [active, setActive] = useState<number | null>(null);

  const top = 1;
  const y = (v: number) => PAD.top + PLOT_H - ((v - floor) / (top - floor)) * PLOT_H;
  const slotW = PLOT_W / ticks.length;
  const x = (i: number) => PAD.left + i * slotW + slotW / 2;

  const axisTicks = [0.6, 0.7, 0.8, 0.9, 1];

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
          {axisTicks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className={styles.grid}
              />
              <text
                x={PAD.left - 8}
                y={y(t) + 4}
                textAnchor="end"
                className={styles.axisLabel}
              >
                {formatPercent(t, 0)}
              </text>
            </g>
          ))}

          {active !== null && (
            <rect
              x={PAD.left + active * slotW}
              y={PAD.top}
              width={slotW}
              height={PLOT_H}
              className={styles.activeBand}
            />
          )}

          {lines.map((line) => {
            const segments: string[] = [];
            let current: string[] = [];
            line.values.forEach((v, i) => {
              if (v === null) {
                if (current.length) segments.push(current.join(" "));
                current = [];
                return;
              }
              current.push(`${current.length ? "L" : "M"}${x(i)},${y(v)}`);
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
                      cx={x(i)}
                      cy={y(v)}
                      r={active === i ? 5 : 3.5}
                      className={`${styles.dot} ${line.className}`}
                    />
                  ),
                )}
              </g>
            );
          })}

          {ticks.map((tick, i) => (
            <text
              key={`lbl-${tick}`}
              x={x(i)}
              y={HEIGHT - 12}
              textAnchor="middle"
              className={active === i ? styles.axisLabelActive : styles.axisLabel}
            >
              {tick}
            </text>
          ))}

          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={PAD.top + PLOT_H}
            y2={PAD.top + PLOT_H}
            className={styles.axis}
          />

          {ticks.map((tick, i) => (
            <rect
              key={`hit-${tick}`}
              x={PAD.left + i * slotW}
              y={PAD.top}
              width={slotW}
              height={PLOT_H}
              className={styles.hit}
              tabIndex={0}
              role="button"
              aria-label={`Xem số liệu ${tick}`}
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
              left: `${((PAD.left + active * slotW + slotW / 2) / WIDTH) * 100}%`,
            }}
            role="status"
          >
            <div className={styles.tipTitle}>{ticks[active]}</div>
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
      <p className={styles.axisNote}>
        Trục dọc bắt đầu từ 60% (không từ 0) để thấy rõ chênh lệch — đọc mức
        tuyệt đối theo nhãn trục, đừng so chiều cao theo tỷ lệ.
      </p>
    </div>
  );
}
