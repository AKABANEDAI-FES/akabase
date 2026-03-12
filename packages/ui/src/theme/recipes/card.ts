import { defineSlotRecipe } from "@pandacss/dev";

export const card = defineSlotRecipe({
  className: "card",
  slots: ["root", "header", "body", "footer", "title", "description"],
  base: {
    root: {
      borderRadius: "l3",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative",
    },
    header: {
      display: "flex",
      flexDirection: "column",
    },
    body: {
      display: "flex",
      flex: "1",
      flexDirection: "column",
    },
    footer: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "3",
    },
    title: {
      fontWeight: "semibold",
    },
    description: {
      color: "fg.muted",
    },
  },
  defaultVariants: {
    variant: "outline",
    size: "md",
  },
  variants: {
    variant: {
      elevated: {
        root: {
          bg: "gray.surface.bg",
          boxShadow: "lg",
        },
      },
      outline: {
        root: {
          bg: "gray.surface.bg",
          borderWidth: "1px",
        },
      },
      subtle: {
        root: {
          bg: "gray.subtle.bg",
        },
      },
    },
    size: {
      sm: {
        root: {
          p: "4",
        },
        header: {
          gap: "1",
          pb: "4",
        },
        footer: {
          pt: "6",
        },
        title: {
          textStyle: "md",
        },
        description: {
          textStyle: "xs",
        },
      },
      md: {
        root: {
          p: "6",
        },
        header: {
          gap: "1",
          pb: "6",
        },
        footer: {
          pt: "8",
        },
        title: {
          textStyle: "lg",
        },
        description: {
          textStyle: "sm",
        },
      },
      lg: {
        root: {
          p: "8",
        },
        header: {
          gap: "1.5",
          pb: "8",
        },
        footer: {
          pt: "10",
        },
        title: {
          textStyle: "xl",
        },
        description: {
          textStyle: "md",
        },
      },
    },
  },
});
