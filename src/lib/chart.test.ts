import assert from "node:assert/strict";
import { test } from "node:test";
import { byCategory, monthKeys, monthsStart, niceScale, sumByMonth } from "./chart.ts";

test("monthKeys crosses year boundaries", () => {
  assert.deepEqual(monthKeys("2026-02-15", 4), ["2025-11", "2025-12", "2026-01", "2026-02"]);
  assert.equal(monthsStart("2026-09-30", 6), "2026-04-01");
});

test("sumByMonth buckets in paise and zero-fills", () => {
  const keys = ["2026-08", "2026-09"];
  const rows = [{ amount: 0.1, d: "2026-09-01" }, { amount: 0.2, d: "2026-09-30" }, { amount: 5, d: "2026-07-31" }];
  assert.deepEqual(sumByMonth(rows, (r) => r.d, keys), [0, 0.3]);
});

test("niceScale rounds up to clean ticks", () => {
  assert.deepEqual(niceScale(106000), { max: 120000, ticks: [0, 30000, 60000, 90000, 120000] });
  assert.deepEqual(niceScale(4000).max, 4000);
  assert.deepEqual(niceScale(0), { max: 1, ticks: [0] });
});

test("byCategory sorts and folds the tail into Other", () => {
  const rows: { amount: number; category: string | null }[] = [
    { amount: 10, category: "a" },
    { amount: 20, category: "b" },
    { amount: 30, category: "c" },
    { amount: 1, category: null },
  ];
  assert.deepEqual(byCategory(rows, 2), [{ name: "c", amount: 30 }, { name: "b", amount: 20 }, { name: "Other", amount: 11 }]);
});
