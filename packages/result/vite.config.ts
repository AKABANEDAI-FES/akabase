import { defineConfig } from "vite-plus";
import { baseConfig } from "@akabase/config/oxlint/base";

export default defineConfig({
  lint: {
    extends: [baseConfig],
    plugins: baseConfig.plugins,
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
