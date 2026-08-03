/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // EN: Serve the app and attach security headers even when the host bypasses Next configuration.
    // RU: Отдаёт приложение и добавляет security headers, даже если хост обходит конфигурацию Next.
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const imageResponse = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return applySecurityHeaders(imageResponse, url.pathname);
    }

    return applySecurityHeaders(await handler.fetch(request, env, ctx), url.pathname);
  },
};

function applySecurityHeaders(response: Response, pathname: string): Response {
  // EN: Add defense-in-depth headers while preserving the rendered body and status.
  // RU: Добавляет defense-in-depth headers, сохраняя тело и статус исходного ответа.
  const hardened = new Response(response.body, response);
  hardened.headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; upgrade-insecure-requests");
  hardened.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  hardened.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  hardened.headers.set("X-Content-Type-Options", "nosniff");
  hardened.headers.set("X-Frame-Options", "DENY");
  hardened.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  hardened.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (pathname.startsWith("/api/") || pathname.startsWith("/app/") || pathname.startsWith("/m/")) {
    hardened.headers.set("Cache-Control", "private, no-store");
  }
  return hardened;
}

export default worker;
