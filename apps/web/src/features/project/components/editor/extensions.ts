import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import type { Extensions } from "@tiptap/react";
import { TextAlign } from "@tiptap/extension-text-align";
import { CustomImage } from "./extensions/image";

/**
 * Tiptap editor extensions configuration
 * Includes basic text formatting, headings, lists, and links
 */
export const editorExtensions: Extensions = [
  StarterKit.configure({
    // Heading with limited levels (H2-H4 only)
    heading: {
      levels: [2, 3, 4],
    },

    // Disable code-related extensions (not needed for pamphlet content)
    code: false,
    codeBlock: false,
    link: false, // We'll add a custom Link extension with specific configuration
  }),

  // Link extension with custom configuration
  Link.configure({
    openOnClick: false, // Don't open links when clicked in editor
    HTMLAttributes: {
      rel: "noopener noreferrer",
      target: "_blank",
    },
  }),
  TextAlign.configure({
    types: ["paragraph", "heading"], // Allow text alignment for paragraphs and headings
  }),

  // Image extension for inline image uploads (with width/height support)
  CustomImage.configure({
    inline: false,
    allowBase64: false,
  }),
];
