import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  // EN: Return the configured D1 client and fail clearly when the host did not provide a DB binding.
  // RU: Возвращает настроенный D1-клиент и сообщает об ошибке, если хост не передал binding DB.
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Configure the DB binding in your hosting environment before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
