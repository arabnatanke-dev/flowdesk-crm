import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationNames = [
  "0000_fast_big_bertha.sql",
  "0001_rich_mathemanic.sql",
  "0002_nervous_scalphunter.sql",
  "0003_mighty_jetstream.sql",
  "0004_optimal_zodiak.sql",
  "0005_bored_dakota_north.sql",
  "0006_fearless_robbie_robertson.sql",
];

async function applyMigrations(database: PGlite, from: number, to: number): Promise<void> {
  // EN: Apply committed statements directly so the data migration can be tested between legacy and current states.
  // RU: Применяет committed statements напрямую для проверки data migration между legacy и текущим состояниями.
  for (const migrationName of migrationNames.slice(from, to)) {
    const sql = await readFile(new URL(`../drizzle/${migrationName}`, import.meta.url), "utf8");
    for (const statement of sql.split("--> statement-breakpoint").map((value) => value.trim()).filter(Boolean)) {
      await database.exec(statement);
    }
  }
}

test("technician migration applies to an empty database", async () => {
  const database = new PGlite();
  try {
    await applyMigrations(database, 0, migrationNames.length);
    const result = await database.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' and table_name = 'technician_profiles'",
    );
    assert.deepEqual(result.rows, [{ table_name: "technician_profiles" }]);
  } finally {
    await database.close();
  }
});

test("technician migration backfills multiple organizations without changing assigned work orders", async () => {
  const database = new PGlite();
  try {
    await applyMigrations(database, 0, 6);
    await database.exec(`
      insert into organizations (id, slug, name) values
        ('00000000-0000-4000-8000-000000000001', 'alpha', 'Alpha'),
        ('00000000-0000-4000-8000-000000000002', 'beta', 'Beta');
      insert into users (id, email, display_name, password_hash) values
        ('00000000-0000-4000-8000-000000000010', 'owner@example.com', 'Owner', 'test'),
        ('00000000-0000-4000-8000-000000000011', 'tech@example.com', 'Legacy Technician', 'test');
      insert into memberships (organization_id, user_id, role, is_active) values
        ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'OWNER', true),
        ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'TECHNICIAN', true),
        ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000011', 'TECHNICIAN', false);
      insert into work_orders (
        id, organization_id, number, client_name, client_phone, title_ru, title_en,
        address_ru, address_en, technician_id, created_by, updated_by
      ) values (
        '00000000-0000-4000-8000-000000000020',
        '00000000-0000-4000-8000-000000000001',
        1001, 'Client', '', 'Заявка', 'Work order', 'Dubai', 'Dubai',
        '00000000-0000-4000-8000-000000000011',
        '00000000-0000-4000-8000-000000000010',
        '00000000-0000-4000-8000-000000000010'
      );
    `);

    await applyMigrations(database, 6, 7);

    const profiles = await database.query<{
      organization_id: string;
      display_name: string;
      is_available: boolean;
      deactivated_at: Date | null;
    }>("select organization_id, display_name, is_available, deactivated_at from technician_profiles order by organization_id");
    assert.equal(profiles.rows.length, 2);
    assert.equal(profiles.rows[0].display_name, "Legacy Technician");
    assert.equal(profiles.rows[0].is_available, true);
    assert.equal(profiles.rows[0].deactivated_at, null);
    assert.equal(profiles.rows[1].is_available, false);
    assert.ok(profiles.rows[1].deactivated_at);

    const workOrder = await database.query<{ technician_id: string }>(
      "select technician_id from work_orders where id = '00000000-0000-4000-8000-000000000020'",
    );
    assert.equal(workOrder.rows[0].technician_id, "00000000-0000-4000-8000-000000000011");

    const user = await database.query<{ must_change_password: boolean }>(
      "select must_change_password from users where id = '00000000-0000-4000-8000-000000000011'",
    );
    assert.equal(user.rows[0].must_change_password, false);
  } finally {
    await database.close();
  }
});
