import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dueGroup, formatDue, todayIn } from "./dates.ts";

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
