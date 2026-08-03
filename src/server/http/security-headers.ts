export type SecurityEnvironment = "development" | "production";

export interface SecurityHeader {
  key: string;
  value: string;
}

interface SecurityHeaderOptions {
  environment: SecurityEnvironment;
  requestUrl?: URL | string;
}

const DEVELOPMENT_CONNECT_SOURCES = [
  "'self'",
  "ws:",
  "wss:",
  "http://localhost:*",
  "https://localhost:*",
  "http://127.0.0.1:*",
  "https://127.0.0.1:*",
  "http://[::1]:*",
  "https://[::1]:*",
];

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized.endsWith(".localhost") || normalized === "127.0.0.1" || normalized === "::1";
}

function getRequestUrl(requestUrl: SecurityHeaderOptions["requestUrl"]): URL | undefined {
  if (requestUrl === undefined) return undefined;
  return typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
}

export function buildContentSecurityPolicy(
  environment: SecurityEnvironment,
  upgradeInsecureRequests = false,
): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    environment === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    environment === "development"
      ? `connect-src ${DEVELOPMENT_CONNECT_SOURCES.join(" ")}`
      : "connect-src 'self'",
    "object-src 'none'",
  ];

  if (environment === "production" && upgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function getSecurityHeaders({ environment, requestUrl }: SecurityHeaderOptions): SecurityHeader[] {
  const url = getRequestUrl(requestUrl);
  // EN: Host-dependent transport headers stay out of static Next config so localhost is never pinned or upgraded.
  // RU: Зависимые от host transport-заголовки не попадают в статический Next config, чтобы localhost не закреплялся и не обновлялся.
  const isPublicProductionRequest = environment === "production" && url !== undefined && !isLocalHostname(url.hostname);
  const headers: SecurityHeader[] = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(environment, isPublicProductionRequest),
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];

  if (isPublicProductionRequest && url.protocol === "https:") {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
  }

  return headers;
}

export function applySecurityHeaders(response: Response, options: SecurityHeaderOptions): Response {
  const hardened = new Response(response.body, response);
  for (const { key, value } of getSecurityHeaders(options)) {
    hardened.headers.set(key, value);
  }
  return hardened;
}
