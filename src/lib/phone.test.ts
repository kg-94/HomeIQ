import assert from "node:assert/strict";
import { test } from "node:test";
import { toE164 } from "./phone.ts";

test("toE164", () => {
  assert.equal(toE164("98765 43210"), "+919876543210");
  assert.equal(toE164("098765-43210"), "+919876543210");
  assert.equal(toE164("+1 (415) 555-0100"), "+14155550100");
  assert.equal(toE164("0014155550100"), "+14155550100");
  assert.equal(toE164("919876543210"), "+919876543210");
  assert.equal(toE164("12345"), null);
  assert.equal(toE164("abc"), null);
  assert.equal(toE164("+0123456789"), null);
});
