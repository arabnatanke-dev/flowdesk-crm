import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    // EN: Preserve a safe public error contract while retaining a normal Error stack.
    // RU: Сохраняет безопасный публичный контракт ошибки и стандартный Error stack.
    super(message);
    this.name = "ApiError";
  }
}

export function assertSameOrigin(request: Request): void {
  // EN: Reject browser mutations that did not originate from the current application origin.
  // RU: Отклоняет browser-мутации, пришедшие не с текущего origin приложения.
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  if (!origin || origin !== expectedOrigin) throw new ApiError(403, "CSRF_REJECTED", "The request origin is not allowed.");
}

export function getClientAddress(request: Request): string {
  // EN: Trust one configured proxy header and fail closed when production proxy identity is not configured.
  // RU: Доверяет одному proxy-заголовку и закрывает доступ, если proxy identity не настроен в production.
  const configuredValue = process.env.TRUSTED_PROXY_HEADER?.trim();
  if (!configuredValue && process.env.NODE_ENV === "production") {
    throw new Error("TRUSTED_PROXY_HEADER is required in production.");
  }
  const configuredHeader = (configuredValue || "cf-connecting-ip").toLowerCase();
  const allowedHeaders = new Set(["cf-connecting-ip", "x-real-ip"]);
  if (!allowedHeaders.has(configuredHeader)) throw new Error("TRUSTED_PROXY_HEADER must be cf-connecting-ip or x-real-ip.");
  const address = request.headers.get(configuredHeader)?.trim();
  if (!address && process.env.NODE_ENV === "production") {
    throw new Error(`Trusted proxy header ${configuredHeader} is missing from the production request.`);
  }
  return address || "unavailable";
}

export function apiErrorResponse(error: unknown): NextResponse {
  // EN: Convert expected API failures to stable JSON and hide unexpected implementation details.
  // RU: Преобразует ожидаемые ошибки API в стабильный JSON и скрывает внутренние детали неожиданных сбоев.
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  console.error("Unhandled API error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." } },
    { status: 500 },
  );
}
