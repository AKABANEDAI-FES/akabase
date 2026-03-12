import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/panda-preset.ts", "src/components/*/index.ts"],
  deps: {
    neverBundle: [
      "@archive/styled-system",
      "@ark-ui/react",
      "react",
      "react-dom",
      "react/jsx-runtime",
      "lucide-react",
    ],
  },
  dts: {
    tsgo: true,
  },
  sourcemap: true,
});
