import type { OxlintConfig } from "vite-plus/lint";
import { baseConfig } from "./base.ts";

export const reactConfig: OxlintConfig = {
  ...baseConfig,
  overrides: [
    ...(baseConfig.overrides ?? []),
    {
      files: ["**/*.{js,ts,tsx}"],
      plugins: ["typescript", "import", "unicorn", "eslint", "promise", "react", "react-perf"],
      rules: {
        "no-console": ["warn", { allow: ["warn", "error", "info", "debug"] }],
      },
    },
    {
      files: ["**/*.{tsx,jsx}"],
      rules: {
        "typescript/promise-function-async": "off",
      },
    },
  ],
};
