export const globalCss = {
  extend: {
    "*": {
      "--global-color-border": "colors.border",
      "--global-color-placeholder": "colors.fg.subtle",
      "--global-color-selection": "colors.colorPalette.subtle.bg",
      "--global-color-focus-ring": "colors.colorPalette.solid.bg",
      "--global-font-body": "sans-serif",
    },
    html: {
      colorPalette: "iris",
      fontSize: {
        base: "14px",
        md: "16px",
      },
    },
    body: {
      background: "bg.canvas",
      color: "fg.default",
    },
  },
};
