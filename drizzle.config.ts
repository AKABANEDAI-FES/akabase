import crypto from "node:crypto";
import { defineConfig } from "drizzle-kit";

// https://github.com/cloudflare/miniflare/blob/d0814db5cfb9e1ae7f7616d2842a02e575ad7b7e/packages/miniflare/src/plugins/shared/index.ts#L144
function durableObjectNamespaceIdFromName(uniqueKey: string, name: string) {
  const key = crypto.createHash("sha256").update(uniqueKey).digest();
  const nameHmac = crypto.createHmac("sha256", key).update(name).digest().subarray(0, 16);
  const hmac = crypto.createHmac("sha256", key).update(nameHmac).digest().subarray(0, 16);
  return Buffer.concat([nameHmac, hmac]).toString("hex");
}

const PERSIST = ".wrangler/state/v3/d1";
const UNIQUE_KEY = "miniflare-D1DatabaseObject";
const PREVIEW_ID = "DB";

const url = `${PERSIST}/${UNIQUE_KEY}/${durableObjectNamespaceIdFromName(UNIQUE_KEY, PREVIEW_ID)}.sqlite`;

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: { url },
});
