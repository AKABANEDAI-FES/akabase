import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { Database as D1Database } from "@/db";
import * as schema from "@/db/schema";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });

  const migrationsDir = join(process.cwd(), "src/db/migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    sqlite.exec(sql);
  }

  return {
    db: db as unknown as D1Database,
    sqlite,
    cleanup: () => sqlite.close(),
  };
}
