import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, daysUntil, dueGroup, formatDue, todayIn, warrantyStatus } from "./dates.ts";

test("todayIn uses the household timezone", () => {
  const lateUtc = new Date("2026-09-30T20:00:00Z"); // 01:30 on Oct 1 in India
  assert.equal(todayIn("UTC", lateUtc), "2026-09-30");
  assert.equal(todayIn("Asia/Kolkata", lateUtc), "2026-10-01");
});

test("addDays crosses month and year ends", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("dueGroup and formatDue", () => {
  const today = "2026-09-30";
  assert.equal(dueGroup("2026-09-29", today), "overdue");
  assert.equal(dueGroup(today, today), "week");
  assert.equal(dueGroup("2026-10-06", today), "week");
  assert.equal(dueGroup("2026-10-07", today), "later");
  assert.equal(formatDue("2026-10-01", today), "Tomorrow");
  assert.equal(formatDue("2027-01-05", today), "5 Jan 2027");
});

test("warrantyStatus", () => {
  const today = "2026-09-30";
  assert.equal(daysUntil("2026-10-30", today), 30);
  assert.equal(warrantyStatus(null, today), null);
  assert.equal(warrantyStatus("2026-09-29", today)?.label, "Warranty expired");
  assert.equal(warrantyStatus(today, today)?.label, "Warranty ends today");
  assert.equal(warrantyStatus("2026-10-30", today)?.tone, "danger");
  assert.equal(warrantyStatus("2027-03-01", today)?.label, "Warranty till 1 Mar 2027");
});
