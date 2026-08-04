import assert from "node:assert/strict";
import test from "node:test";
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  getSecurityHeaders,
} from "../src/server/http/security-headers";

function headerValue(headers: ReturnType<typeof getSecurityHeaders>, key: string): string | undefined {
  return headers.find((header) => header.key === key)?.value;
}

test("development CSP permits HMR without broad HTTP connection sources", () => {
  const policy = buildContentSecurityPolicy("development");

  assert.match(policy, /script-src[^;]*'unsafe-eval'/);
  assert.match(policy, /connect-src[^;]*ws:/);
  assert.match(policy, /connect-src[^;]*wss:/);
  assert.match(policy, /connect-src[^;]*http:\/\/localhost:\*/);
  assert.match(policy, /connect-src[^;]*http:\/\/127\.0\.0\.1:\*/);
  assert.doesNotMatch(policy, /connect-src[^;]*\shttp:\s/);
  assert.doesNotMatch(policy, /connect-src[^;]*\shttps:\s/);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test("production CSP stays strict and excludes development allowances", () => {
  const policy = buildContentSecurityPolicy("production");

  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /connect-src 'self'/);
  assert.doesNotMatch(policy, /unsafe-eval/);
  assert.doesNotMatch(policy, /\bws:/);
  assert.doesNotMatch(policy, /\bwss:/);
});

test("public HTTPS production responses receive transport hardening", () => {
  const headers = getSecurityHeaders({
    environment: "production",
    requestUrl: "https://flowdesk.example/app/horizon/dashboard",
  });

  assert.match(headerValue(headers, "Content-Security-Policy") ?? "", /upgrade-insecure-requests/);
  assert.equal(headerValue(headers, "Strict-Transport-Security"), "max-age=31536000; includeSubDomains");
});

test("localhost responses never receive HSTS or insecure-request upgrades", () => {
  for (const requestUrl of [
    "http://localhost:3001/app/horizon/dashboard",
    "https://localhost:3001/app/horizon/dashboard",
    "http://127.0.0.1:3001/app/horizon/dashboard",
    "http://[::1]:3001/app/horizon/dashboard",
  ]) {
    const headers = getSecurityHeaders({ environment: "production", requestUrl });
    assert.doesNotMatch(headerValue(headers, "Content-Security-Policy") ?? "", /upgrade-insecure-requests/);
    assert.equal(headerValue(headers, "Strict-Transport-Security"), undefined);
  }
});

test("security headers preserve the original response", async () => {
  const response = applySecurityHeaders(
    new Response("ok", { status: 202, headers: { "X-Existing": "kept" } }),
    { environment: "production", requestUrl: "https://flowdesk.example" },
  );

  assert.equal(response.status, 202);
  assert.equal(response.headers.get("X-Existing"), "kept");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(await response.text(), "ok");
});
