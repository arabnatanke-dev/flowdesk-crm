import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

function createDrizzleClient(pool: Pool) {
  // EN: Bind one Neon WebSocket pool to a typed Drizzle client for a single lifecycle.
  // RU: Связывает один Neon WebSocket pool с типизированным Drizzle-клиентом для одного lifecycle.
  return drizzle(pool, { schema });
}

export type FlowDeskDatabase = ReturnType<typeof createDrizzleClient>;

let databaseForTests: FlowDeskDatabase | null = null;

export async function withRequestDatabase<T>(
  operation: (database: FlowDeskDatabase) => Promise<T>,
): Promise<T> {
  // EN: Create and close one Neon pool around all database work performed by one request or command.
  // RU: Создаёт и закрывает один Neon pool вокруг всей работы с БД одного запроса или команды.
  if (databaseForTests) return operation(databaseForTests);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Copy .env.example to .env.local and configure PostgreSQL/Neon.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    return await operation(createDrizzleClient(pool));
  } finally {
    await pool.end();
  }
}

export function installDatabaseForTests(testDatabase: unknown): FlowDeskDatabase {
  // EN: Install a suite-owned database without making production connections global or closing PGlite per call.
  // RU: Устанавливает БД набора тестов без глобальных production-соединений и закрытия PGlite после каждого вызова.
  if (process.env.NODE_ENV === "production") throw new Error("Test database injection is disabled in production.");
  databaseForTests = testDatabase as FlowDeskDatabase;
  return databaseForTests;
}

export function resetDatabaseForTests(): void {
  // EN: Remove only the test override; production request pools are never stored at module scope.
  // RU: Удаляет только тестовую подмену; production request pools никогда не хранятся на уровне модуля.
  if (process.env.NODE_ENV === "production") throw new Error("Test database reset is disabled in production.");
  databaseForTests = null;
}
