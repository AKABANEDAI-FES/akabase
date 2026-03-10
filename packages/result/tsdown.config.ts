import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  deps: {
    onlyAllowBundle: ["@praha/byethrow", "@standard-schema/spec"],
  },
});
