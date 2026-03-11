import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/panda-preset.ts", "src/components/*/index.ts"],
  dts: {
    tsgo: true,
  },
  sourcemap: true,
});
