import { defineConfig } from "vite-plus";
import { baseConfig } from "@akabase/config/oxlint/base";

export default defineConfig({
  lint: {
    extends: [baseConfig],
    plugins: baseConfig.plugins,
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
