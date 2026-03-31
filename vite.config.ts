import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    printWidth: 100,
    experimentalSortPackageJson: false,
    ignorePatterns: [
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "worker-configuration.d.ts",
      "routeTree.gen.ts",
    ],
  },
});
