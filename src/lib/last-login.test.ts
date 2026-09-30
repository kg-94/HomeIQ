import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeLastLogin, encodeLastLogin } from "./last-login.ts";

test("last-login cookie round-trips and rejects junk", () => {
  const l = { provider: "discord" as const, name: "Ketan", email: "k@example.com" };
  assert.deepEqual(decodeLastLogin(encodeLastLogin(l)), l);
  assert.equal(decodeLastLogin(undefined), null);
  assert.equal(decodeLastLogin("not-base64-json"), null);
  assert.equal(decodeLastLogin(Buffer.from('{"provider":"github"}').toString("base64url")), null);
});
