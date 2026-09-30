import assert from "node:assert/strict";
import { test } from "node:test";
import { allTags, parseIcon, parseTags } from "./tags.ts";

test("parseTags normalises, dedupes and caps", () => {
  assert.deepEqual(parseTags("Kitchen, car ,kitchen,,  Tax   2026 "), ["kitchen", "car", "tax 2026"]);
  assert.deepEqual(parseTags(""), []);
  assert.deepEqual(parseTags(null), []);
  assert.equal(parseTags(Array.from({ length: 15 }, (_, i) => `t${i}`).join(",")).length, 10);
  assert.equal(parseTags("x".repeat(40))[0].length, 30);
});

test("allTags collects distinct sorted tags", () => {
  assert.deepEqual(allTags([{ tags: ["car", "tax"] }, { tags: ["appliance", "car"] }]), ["appliance", "car", "tax"]);
});

test("parseIcon accepts emoji only", () => {
  assert.equal(parseIcon("🏡"), "🏡");
  assert.equal(parseIcon(" 🏖️ "), "🏖️");
  assert.equal(parseIcon("home"), null);
  assert.equal(parseIcon(""), null);
});
