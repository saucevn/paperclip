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

// Keep en-US for USD amounts to avoid confusing $1.234,56 formatting for Vietnamese users
export function formatCentsLocale(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
