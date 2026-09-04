import test from "node:test";
import assert from "node:assert/strict";
import { lastSevenShopDays, shopDayKey, shopWeekdayLabel } from "./shop-time.js";

test("an evening sale belongs to the day the shop was open", () => {
  // Tuesday 2 September 2026, 20:30 in Guayaquil is 01:30 UTC on Wednesday.
  // Cutting the date out of the ISO text gave Wednesday, which moved the
  // busiest hours of every day into the next one.
  const eveningSale = new Date("2026-09-03T01:30:00.000Z");
  assert.equal(eveningSale.toISOString().slice(0, 10), "2026-09-03");
  assert.equal(shopDayKey(eveningSale), "2026-09-02");
});

test("midnight in the shop starts the new day", () => {
  // 04:59 UTC is 23:59 the previous day in Guayaquil; 05:00 UTC is midnight.
  assert.equal(shopDayKey(new Date("2026-09-03T04:59:59.000Z")), "2026-09-02");
  assert.equal(shopDayKey(new Date("2026-09-03T05:00:00.000Z")), "2026-09-03");
});

test("the day is written the way the buckets are keyed", () => {
  // Built from the parts, so a locale that prints 09/03 cannot reorder it.
  assert.match(shopDayKey(new Date("2026-01-05T12:00:00.000Z")), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(shopDayKey(new Date("2026-01-05T12:00:00.000Z")), "2026-01-05");
});

test("seven days end today and carry no gaps", () => {
  const days = lastSevenShopDays(new Date("2026-09-03T12:00:00.000Z"));
  assert.equal(days.length, 7);
  assert.equal(days[6].date, "2026-09-03");
  assert.equal(days[0].date, "2026-08-28");
  assert.equal(new Set(days.map((day) => day.date)).size, 7);
  // Every bucket carries a label for the chart to print.
  assert.ok(days.every((day) => day.label.length > 0));
});

test("the eight day window covers every shop day it has to bucket", () => {
  // The query cuts in UTC and the buckets are counted in the shop's zone, so
  // the window has to reach past the oldest bucket it needs to fill.
  const now = new Date("2026-09-03T00:30:00.000Z");
  const windowStart = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const oldest = lastSevenShopDays(now)[0].date;
  assert.ok(shopDayKey(windowStart) < oldest, `${shopDayKey(windowStart)} debe ser anterior a ${oldest}`);
});

test("the weekday is named in Spanish", () => {
  assert.match(shopWeekdayLabel(new Date("2026-09-03T12:00:00.000Z")), /^[a-záéíóúñ]{2,}\.?$/i);
});
