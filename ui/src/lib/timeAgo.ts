import i18n from "@/i18n";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.round((now - then) / 1000);

  if (seconds < MINUTE) return i18n.t("common:timeAgo.justNow");
  if (seconds < HOUR) {
    return i18n.t("common:timeAgo.minutesAgo", { count: Math.floor(seconds / MINUTE) });
  }
  if (seconds < DAY) {
    return i18n.t("common:timeAgo.hoursAgo", { count: Math.floor(seconds / HOUR) });
  }
  if (seconds < WEEK) {
    return i18n.t("common:timeAgo.daysAgo", { count: Math.floor(seconds / DAY) });
  }
  if (seconds < MONTH) {
    return i18n.t("common:timeAgo.weeksAgo", { count: Math.floor(seconds / WEEK) });
  }
  return i18n.t("common:timeAgo.monthsAgo", { count: Math.floor(seconds / MONTH) });
}
