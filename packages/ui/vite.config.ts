import { defineConfig } from "vite-plus";
import { reactConfig } from "@archive/config/oxlint/react";

export default defineConfig({
  lint: {
    ...reactConfig,
    overrides: [
      ...(reactConfig.overrides ?? []),
      {
        files: ["src/components/**/*.tsx"],
        rules: {
          "typescript/no-unsafe-type-assertion": "off",
        },
      },
    ],
  },
  pack: {
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
  },
});
