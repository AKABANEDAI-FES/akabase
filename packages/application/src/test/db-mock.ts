import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { Database } from "@akabase/infrastructure/db";
import { schema } from "@akabase/infrastructure/db";
import { migrate } from "drizzle-orm/libsql/migrator";
// oxlint-disable-next-line import/no-nodejs-modules
import { join } from "node:path";

export async function createTestDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });

  const migrationsFolder = join(
    process.cwd(),
    "node_modules/@akabase/infrastructure/src/db/migrations",
  );

  await migrate(db, { migrationsFolder });

  return {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    db: db as unknown as Database,
    client,
    cleanup: () => client.close(),
  };
}
