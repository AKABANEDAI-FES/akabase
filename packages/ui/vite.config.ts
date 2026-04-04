import { defineConfig } from "vite-plus";
import { reactConfig } from "@akabase/config/oxlint/react";

export default defineConfig({
  lint: {
    extends: [reactConfig],
    plugins: reactConfig.plugins,
    overrides: [
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
        "@akabase/styled-system",
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
