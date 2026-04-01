import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { reactConfig } from "@archive/config/oxlint/react";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    devtools(),
    tanstackStart(),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
  ],
  lint: {
    extends: [reactConfig],
    plugins: reactConfig.plugins,
    ignorePatterns: ["postcss.config.cjs", "worker-configuration.d.ts", "routeTree.gen.ts"],
    overrides: [
      {
        files: ["src/routes/**/*.{ts,tsx}"],
        rules: {
          "unicorn/filename-case": "off",
        },
      },
    ],
  },
});
