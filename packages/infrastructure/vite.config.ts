import { defineConfig } from "vite-plus";
import { baseConfig } from "@archive/config/oxlint/base";

export default defineConfig({
  lint: {
    ...baseConfig,
    ignorePatterns: ["worker-configuration.d.ts"],
  },
  pack: {
    entry: [
      "src/auth/index.ts",
      "src/db/index.ts",
      "src/repositories/*.ts",
      "src/services/*.ts",
      "src/storage/*.ts",
    ],
    dts: {
      tsgo: true,
    },
    sourcemap: true,
    deps: {
      alwaysBundle: [],
    },
  },
});
