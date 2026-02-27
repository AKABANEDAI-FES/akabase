import { defineSlotRecipe } from "@pandacss/dev";

export const richTextEditor = defineSlotRecipe({
  className: "richTextEditor",
  slots: ["root", "toolbar", "content"],
  base: {
    root: {
      borderWidth: "1px",
      borderColor: "gray.outline.border",
      borderRadius: "l2",
      overflow: "hidden",
      transition: "colors",
      display: "grid",
      gridTemplateRows: "auto 1fr",
      "&[data-invalid=true]": {
        borderColor: "error",
        _focusWithin: {
          outlineColor: "error",
        },
      },
      "&[data-disabled=true]": {
        layerStyle: "disabled",
        cursor: "not-allowed",
      },
    },
    toolbar: {
      p: "2",
      borderBottomWidth: "1px",
      borderColor: "gray.outline.border",
      bg: "gray.surface.bg",
    },
    content: {
      outline: "none",
      display: "grid",
      overflowY: "auto",
      bg: "gray.surface.bg",

      // ProseMirror base styles
      "& .ProseMirror": {
        outline: "none",
        minHeight: "inherit",
        minH: "100%",
        maxW: "3xl",
        mx: "auto",
      },

      // Paragraph styles
      "& .ProseMirror p": {
        marginBottom: "1em",
        _last: {
          marginBottom: "0",
        },
      },

      // Heading styles
      "& .ProseMirror h2": {
        textStyle: "2xl",
        fontWeight: "bold",
        marginTop: "1em",
        marginBottom: "0.5em",
        _first: {
          marginTop: "0",
        },
      },
      "& .ProseMirror h3": {
        textStyle: "xl",
        fontWeight: "bold",
        marginTop: "0.8em",
        marginBottom: "0.4em",
        _first: {
          marginTop: "0",
        },
      },
      "& .ProseMirror h4": {
        textStyle: "lg",
        fontWeight: "semibold",
        marginTop: "0.6em",
        marginBottom: "0.3em",
        _first: {
          marginTop: "0",
        },
      },

      // List styles
      "& .ProseMirror ul, & .ProseMirror ol": {
        paddingLeft: "6",
        marginBottom: "1em",
        _last: {
          marginBottom: "0",
        },
      },
      "& .ProseMirror ul": {
        listStyleType: "disc",
      },
      "& .ProseMirror ol": {
        listStyleType: "decimal",
      },
      "& .ProseMirror li": {
        marginBottom: "0.25em",
      },

      // Blockquote styles
      "& .ProseMirror blockquote": {
        borderLeftWidth: "4px",
        borderColor: "gray.outline.border",
        paddingLeft: "4",
        fontStyle: "italic",
        color: "fg.muted",
        marginBottom: "1em",
        _last: {
          marginBottom: "0",
        },
      },

      // Horizontal rule styles
      "& .ProseMirror hr": {
        borderTopWidth: "1px",
        borderColor: "gray.outline.border",
        marginY: "4",
      },

      // Link styles
      "& .ProseMirror a": {
        color: "colorPalette.solid.bg",
        textDecoration: "underline",
        cursor: "pointer",
      },

      // Placeholder styles
      "& .ProseMirror p.is-editor-empty:first-child::before": {
        content: "attr(data-placeholder)",
        color: "fg.muted",
        pointerEvents: "none",
        height: "0",
        float: "left",
      },

      // Focus styles
      "& .ProseMirror-focused": {
        outline: "none",
      },
    },
  },
  variants: {
    size: {
      sm: {
        root: { h: "xs" },
        content: { p: "3" },
      },
      md: {
        root: { h: "sm" },
        content: { p: "4" },
      },
      lg: {
        root: { h: "md" },
        content: { p: "5" },
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});
