import i18n from "./index";

function getLocale(): string {
  return i18n.language === "vi" ? "vi-VN" : "en-US";
}

export function formatDateLocale(date: Date | string): string {
  return new Date(date).toLocaleDateString(getLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTimeLocale(date: Date | string): string {
  return new Date(date).toLocaleString(getLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortDateLocale(date: Date | string): string {
  return new Date(date).toLocaleString(getLocale(), {
    month: "short",
    day: "numeric",
  });
}

export function formatNumberLocale(n: number): string {
  return n.toLocaleString(getLocale());
}

// Token counts use compact suffixes (1.2M, 1.5k) — locale-agnostic
export function formatTokensLocale(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// Keep en-US for USD amounts to avoid confusing $1.234,56 formatting for Vietnamese users
export function formatCentsLocale(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
