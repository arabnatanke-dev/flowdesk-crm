import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

let database: ReturnType<typeof createDatabase> | null = null;

function createDatabase() {
  // EN: Build a stateless Neon HTTP client suitable for Node and edge-style runtimes.
  // RU: Создаёт stateless Neon HTTP-клиент для Node и edge-подобных окружений.
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Copy .env.example to .env.local and configure PostgreSQL/Neon.");
  }
  return drizzle(new Pool({ connectionString: databaseUrl }), { schema });
}

export function getDb() {
  // EN: Reuse the configured Drizzle client within one server runtime instance.
  // RU: Переиспользует настроенный Drizzle-клиент внутри одного server runtime.
  database ??= createDatabase();
  return database;
}

export type FlowDeskDatabase = ReturnType<typeof getDb>;

export function installDatabaseForTests(testDatabase: unknown): void {
  // EN: Replace the singleton only in tests so services can run against an isolated PostgreSQL engine.
  // RU: Заменяет singleton только в тестах для запуска сервисов на изолированном PostgreSQL engine.
  if (process.env.NODE_ENV === "production") throw new Error("Test database injection is disabled in production.");
  database = testDatabase as ReturnType<typeof createDatabase>;
}

export function resetDatabaseForTests(): void {
  // EN: Clear the injected database after an isolated integration-test suite.
  // RU: Очищает внедрённую БД после изолированного набора интеграционных тестов.
  if (process.env.NODE_ENV === "production") throw new Error("Test database reset is disabled in production.");
  database = null;
}
