import { archivePreset } from "@archive/ui/panda-preset";
import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  presets: ["@pandacss/dev/presets", archivePreset],
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}", "./packages/ui/src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // The output directory for your css system
  importMap: "@archive/styled-system",
  outdir: "./packages/styled-system",

  jsxFramework: "react",

  staticCss: {
    recipes: {
      toast: ["*"],
    },
  },
});
