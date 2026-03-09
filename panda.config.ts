import { green } from "@/theme/colors/green";
import { red } from "@/theme/colors/red";
import { slate } from "@/theme/colors/slate";
import { iris } from "@/theme/colors/iris";
import { animationStyles } from "@/theme/animation-styles";
import { zIndex } from "@/theme/tokens/z-index";
import { shadows } from "@/theme/tokens/shadows";
import { durations } from "@/theme/tokens/durations";
import { colors } from "@/theme/tokens/colors";
import { textStyles } from "@/theme/text-styles";
import { layerStyles } from "@/theme/layer-styles";
import { keyframes } from "@/theme/keyframes";
import { globalCss } from "@/theme/global-css";
import { conditions } from "@/theme/conditions";
import { recipes, slotRecipes } from "@/theme/recipes";
import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {
      animationStyles: animationStyles,
      recipes: recipes,
      slotRecipes: slotRecipes,
      keyframes: keyframes,
      layerStyles: layerStyles,
      textStyles: textStyles,

      tokens: {
        colors: colors,
        durations: durations,
        zIndex: zIndex,
      },

      semanticTokens: {
        colors: {
          fg: {
            default: {
              value: {
                _light: "{colors.gray.12}",
                _dark: "{colors.gray.12}",
              },
            },

            muted: {
              value: {
                _light: "{colors.gray.11}",
                _dark: "{colors.gray.11}",
              },
            },

            subtle: {
              value: {
                _light: "{colors.gray.10}",
                _dark: "{colors.gray.10}",
              },
            },
          },

          border: {
            value: {
              _light: "{colors.gray.4}",
              _dark: "{colors.gray.4}",
            },
          },

          error: {
            value: {
              _light: "{colors.red.9}",
              _dark: "{colors.red.9}",
            },
          },

          bg: {
            canvas: {
              value: { _light: "{colors.gray.1}", _dark: "{colors.gray.1}" },
            },
            default: { value: { _light: "white", _dark: "{colors.gray.2}" } },
          },

          iris: iris,
          gray: slate,
          red: red,
          green: green,
        },

        shadows: shadows,

        radii: {
          l1: {
            value: "{radii.lg}",
          },

          l2: {
            value: "{radii.xl}",
          },

          l3: {
            value: "{radii.2xl}",
          },
        },
      },
    },
  },

  // The output directory for your css system
  importMap: "@archive/styled-system",
  outdir: "./packages/styled-system",

  globalCss: globalCss,
  conditions: conditions,
  jsxFramework: "react",

  staticCss: {
    recipes: {
      toast: ["*"],
    },
  },
});
