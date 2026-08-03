import assert from "node:assert/strict";
import test from "node:test";
import { createOpaqueToken, hashPassword, hashPrivateIdentifier, sha256Hex, verifyPassword } from "../src/server/security/crypto";
import {
  canAccessOfficeSection,
  canCreateWorkOrder,
  canReadAllWorkOrders,
  canReadWorkOrders,
  canTransitionWorkOrder,
  canUpdateSettings,
} from "../src/server/auth/permissions";
import { getClientAddress } from "../src/server/http/api";

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
  assert.equal(canReadAllWorkOrders("DISPATCHER"), true);
  assert.equal(canReadAllWorkOrders("TECHNICIAN"), false);
  assert.equal(canReadWorkOrders("ACCOUNTANT"), false);
  assert.equal(canAccessOfficeSection("ACCOUNTANT", "finance"), true);
  assert.equal(canAccessOfficeSection("ACCOUNTANT", "work-orders"), false);
  assert.equal(canAccessOfficeSection("TECHNICIAN", "dashboard"), false);
});

test("uses only the configured trusted reverse-proxy address header", () => {
  process.env.TRUSTED_PROXY_HEADER = "cf-connecting-ip";
  const spoofed = new Request("https://flowdesk.example", { headers: { "x-forwarded-for": "198.51.100.10" } });
  const trusted = new Request("https://flowdesk.example", { headers: { "cf-connecting-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.10" } });
  assert.equal(getClientAddress(spoofed), "unavailable");
  assert.equal(getClientAddress(trusted), "203.0.113.10");
});
