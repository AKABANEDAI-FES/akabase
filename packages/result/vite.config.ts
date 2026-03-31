import { defineConfig } from "vite-plus";
import { baseConfig } from "@archive/config/oxlint/base";

export default defineConfig({
  lint: {
    ...baseConfig,
  },
  pack: {
    entry: "src/index.ts",
    dts: true,
    sourcemap: true,
    deps: {
      onlyBundle: ["@praha/byethrow", "@standard-schema/spec"],
    },
  },
});
