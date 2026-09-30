import assert from "node:assert/strict";
import { test } from "node:test";
import { settleUp, splitEqually, toPaise } from "./money.ts";

test("toPaise", () => {
  assert.equal(toPaise("1,234.5"), 123450);
  assert.equal(toPaise("₹ 99.99"), 9999);
  assert.equal(toPaise("0.1"), 10);
  assert.equal(toPaise("100"), 10000);
  assert.equal(toPaise("1.234"), null);
  assert.equal(toPaise("-5"), null);
  assert.equal(toPaise("abc"), null);
  assert.equal(toPaise(""), null);
});

test("splitEqually sums exactly", () => {
  assert.deepEqual(splitEqually(10001, 2), [5001, 5000]);
  assert.deepEqual(splitEqually(100, 3), [34, 33, 33]);
  for (const [p, n] of [[1, 3], [99999, 7], [12345678, 9]]) {
    assert.equal(splitEqually(p, n).reduce((a, b) => a + b, 0), p);
  }
});

test("settleUp", () => {
  assert.deepEqual(settleUp({ a: 5000, b: -5000 }), [{ from: "b", to: "a", paise: 5000 }]);
  assert.deepEqual(settleUp({ a: 0, b: 0 }), []);
  const t = settleUp({ a: 6000, b: -1000, c: -2000, d: -3000 });
  assert.equal(t.length, 3);
  const net: Record<string, number> = { a: 6000, b: -1000, c: -2000, d: -3000 };
  for (const { from, to, paise } of t) { net[from] += paise; net[to] -= paise; }
  assert.ok(Object.values(net).every((v) => v === 0));
});
