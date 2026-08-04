import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "@neondatabase/serverless";
import { withRequestDatabase } from "../db/index";

test("closes a distinct Neon pool after successful and failed request work", async (testContext) => {
  // EN: Replace only Pool.end so lifecycle behavior is verified without opening a network connection.
  // RU: Подменяет только Pool.end, чтобы проверить lifecycle без открытия сетевого соединения.
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalEndDescriptor = Object.getOwnPropertyDescriptor(Pool.prototype, "end");
  const closedPools: Pool[] = [];
  const callbackPools: unknown[] = [];
  const expectedError = new Error("request failed");

  Object.defineProperty(Pool.prototype, "end", {
    configurable: true,
    value: async function closeTestPool(this: Pool): Promise<void> {
      // EN: Record the exact request pool whose production end method would be awaited.
      // RU: Запоминает точный request-pool, чей production end был бы вызван с await.
      closedPools.push(this);
    },
  });
  process.env.DATABASE_URL = "postgresql://test:test@example.com/flowdesk";

  testContext.after(() => {
    // EN: Restore process and prototype state so other test files remain isolated.
    // RU: Восстанавливает process и prototype, чтобы остальные тесты оставались изолированными.
    if (originalEndDescriptor) Object.defineProperty(Pool.prototype, "end", originalEndDescriptor);
    else Reflect.deleteProperty(Pool.prototype, "end");
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  const result = await withRequestDatabase(async (database) => {
    // EN: Capture the pool exposed by Drizzle during successful request work.
    // RU: Запоминает pool, предоставленный Drizzle во время успешной работы запроса.
    callbackPools.push(database.$client);
    return "completed";
  });
  assert.equal(result, "completed");

  await assert.rejects(
    () => withRequestDatabase(async (database) => {
      // EN: Capture the second pool and fail inside the request operation.
      // RU: Запоминает второй pool и создаёт ошибку внутри request-operation.
      callbackPools.push(database.$client);
      throw expectedError;
    }),
    (error: unknown) => error === expectedError,
  );

  assert.equal(closedPools.length, 2);
  assert.notEqual(callbackPools[0], callbackPools[1]);
  assert.deepEqual(closedPools, callbackPools);
});
