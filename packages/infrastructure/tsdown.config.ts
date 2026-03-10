import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/auth/index.ts",
    "src/db/index.ts",
    "src/repository/*.ts",
    "src/service/*.ts",
    "src/storage/*.ts",
  ],
  dts: {
    tsgo: true,
  },
  sourcemap: true,
  deps: {
    alwaysBundle: [],
  },
});
