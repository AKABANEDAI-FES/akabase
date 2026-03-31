import { defineConfig } from "vite-plus";
import { baseConfig } from "@archive/config/oxlint/base";

export default defineConfig({
  lint: {
    ...baseConfig,
  },
  pack: {
    entry: ["src/**/*.ts", "!src/**/*.test.ts"],
    dts: {
      tsgo: true,
    },
    sourcemap: true,
    deps: {
      alwaysBundle: [],
    },
  },
});
