import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  // EN: Render a production worker route for structural smoke verification.
  // RU: Рендерит production worker-route для структурной smoke-проверки.
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html", host: "localhost" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the localized FlowDesk authentication entry point", async () => {
  // EN: Verify root identity, social metadata and starter-marker removal.
  // RU: Проверяет identity корня, social metadata и удаление starter-маркеров.
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>FlowDesk CRM<\/title>/i);
  assert.match(html, /FlowDesk/);
  assert.match(html, /Horizon Service Co\./);
  assert.match(html, /RU/);
  assert.match(html, /EN/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("keeps bilingual function documentation and final social asset", async () => {
  // EN: Protect the requested bilingual code-comment convention and OG asset.
  // RU: Защищает требование двуязычных комментариев и наличие OG-ресурса.
  const [shell, workOrders, ogImage] = await Promise.all([
    readFile(new URL("../src/shared/ui/flowdesk-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/work-orders/domain/state-machine.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/og.png", import.meta.url)),
  ]);
  assert.match(shell, /EN:/);
  assert.match(shell, /RU:/);
  assert.match(workOrders, /getAvailableTransitions/);
  assert.ok(ogImage.byteLength > 100_000);
});

test("removes disposable starter UI from the final product", async () => {
  // EN: Ensure the build no longer references the disposable preview surface.
  // RU: Проверяет, что сборка больше не ссылается на временный preview-интерфейс.
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(layout, /codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(layout, /og\.png/);
  assert.ok(templateRoot);
});
