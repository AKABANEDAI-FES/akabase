import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  dts: true,
  sourcemap: true,
  deps: {
    onlyAllowBundle: ["@praha/byethrow", "@standard-schema/spec"],
  },
});
