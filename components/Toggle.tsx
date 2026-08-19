"use client";

import styles from "./Toggle.module.css";

interface ToggleProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  variant?: "orange" | "blue";
  size?: "md" | "sm";
  ariaLabel: string;
}

export default function Toggle<T extends string>({
  options,
  value,
  onChange,
  variant = "orange",
  size = "md",
  ariaLabel,
}: ToggleProps<T>) {
  return (
    <div
      className={[
        styles.toggle,
        size === "sm" ? styles.small : "",
        variant === "blue" ? styles.blue : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={opt.value === value ? styles.on : undefined}
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
