import { akabasePreset } from "@akabase/ui/panda-preset";
import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  presets: ["@pandacss/dev/presets", akabasePreset],
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}", "./node_modules/@akabase/ui/src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // The output directory for your css system
  importMap: "@akabase/styled-system",
  outdir: "../../packages/styled-system",

  jsxFramework: "react",

  staticCss: {
    recipes: {
      toast: ["*"],
    },
  },
});
