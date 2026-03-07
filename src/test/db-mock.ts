import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { Database as D1Database } from "@/db";
import * as schema from "@/db/schema";
import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";

export async function createTestDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });

  const migrationsFolder = join(process.cwd(), "src/db/migrations");

  await migrate(db, { migrationsFolder });

  return {
    db: db as unknown as D1Database,
    client,
    cleanup: () => client.close(),
  };
}
