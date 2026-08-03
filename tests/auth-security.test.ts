import assert from "node:assert/strict";
import test from "node:test";
import { createOpaqueToken, hashPassword, hashPrivateIdentifier, sha256Hex, verifyPassword } from "../src/server/security/crypto";
import { canCreateWorkOrder, canTransitionWorkOrder, canUpdateSettings } from "../src/server/auth/permissions";

test("hashes passwords with a random salt and verifies only the correct secret", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword("anything", "malformed"), false);
});

test("creates opaque session tokens and stores only deterministic digests", async () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.equal((await sha256Hex(first)).length, 64);
  assert.equal(await sha256Hex(first), await sha256Hex(first));
  assert.equal(await hashPrivateIdentifier("203.0.113.8"), await hashPrivateIdentifier("203.0.113.8"));
  assert.notEqual(await hashPrivateIdentifier("203.0.113.8"), await hashPrivateIdentifier("203.0.113.9"));
});

test("enforces role capabilities for creation, field transitions and settings", () => {
  assert.equal(canCreateWorkOrder("DISPATCHER"), true);
  assert.equal(canCreateWorkOrder("TECHNICIAN"), false);
  assert.equal(canTransitionWorkOrder("TECHNICIAN", "EN_ROUTE"), true);
  assert.equal(canTransitionWorkOrder("TECHNICIAN", "CLOSED"), false);
  assert.equal(canUpdateSettings("ADMIN"), true);
  assert.equal(canUpdateSettings("DISPATCHER"), false);
});
