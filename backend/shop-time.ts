/**
 * The shop's calendar day.
 *
 * Migration 011 made the columns TIMESTAMPTZ so an instant travels as an
 * instant and every browser renders it in its own zone. That fixed what is
 * displayed. It does not fix what is counted: grouping a week of sales happens
 * on the server, which runs in UTC on Vercel, and a liquor shop in Ecuador
 * sells hardest after dark. A sale at 20:30 on Tuesday in Guayaquil is 01:30
 * Wednesday in UTC, so cutting the date out of the ISO text moved the busiest
 * hours of every day into the next one.
 *
 * Kept apart from storage.ts so it can be tested without the Supabase client,
 * which validates its configuration while it loads.
 */

// Ecuador keeps UTC-5 all year. When a shop outside it appears, this belongs on
// the organizations row rather than here.
export const SHOP_TIME_ZONE = "America/Guayaquil";

const dayParts = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const weekday = new Intl.DateTimeFormat("es-EC", {
  timeZone: SHOP_TIME_ZONE,
  weekday: "short",
});

/** The date this instant falls on in the shop, as `YYYY-MM-DD`. */
export function shopDayKey(instant: Date): string {
  // Built from the parts rather than from a locale's own ordering, which is
  // what decides whether a date reads 03/09 or 09/03.
  const parts = dayParts.formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** How that day is named on the dashboard: "mar", "mié". */
export function shopWeekdayLabel(instant: Date): string {
  return weekday.format(instant);
}

/** The seven shop days ending today, oldest first. */
export function lastSevenShopDays(now: Date = new Date()): Array<{ date: string; label: string }> {
  const days: Array<{ date: string; label: string }> = [];
  for (let offset = 6; offset >= 0; offset--) {
    const instant = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    days.push({ date: shopDayKey(instant), label: shopWeekdayLabel(instant) });
  }
  return days;
}
