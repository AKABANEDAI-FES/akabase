import { z } from "zod";
import {
  renderToHTMLString,
  serializeChildrenToHTMLString,
} from "@tiptap/static-renderer/pm/html-string";
import { renderToMarkdown } from "@tiptap/static-renderer/pm/markdown";
import type { NodeProps } from "@tiptap/static-renderer";
import type { JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { editorExtensions } from "../components/editor/extensions";

const webContentSchema = z.looseObject({ type: z.string() });

export function renderWebContentHtml(content: unknown, origin: string): string | null {
  const parsed = webContentSchema.safeParse(content);
  if (!parsed.success) {
    return null;
  }

  try {
    return renderToHTMLString({
      content: withAbsoluteImageSrc(parsed.data, origin),
      extensions: editorExtensions,
    });
  } catch (error) {
    console.error("Failed to render web content:", error);
    return null;
  }
}

/** Read as plain text by people, not rendered, so nothing is escaped */
export function renderWebContentMarkdown(content: unknown, origin: string): string | null {
  const parsed = webContentSchema.safeParse(content);
  if (!parsed.success) {
    return null;
  }

  try {
    const markdown = renderToMarkdown({
      content: withAbsoluteImageSrc(parsed.data, origin),
      extensions: editorExtensions,
      options: { nodeMapping: markdownNodeMapping },
    });
    return trimBlankLines(markdown.replaceAll(/\n{3,}/g, "\n\n")) || null;
  } catch (error) {
    console.error("Failed to render web content as Markdown:", error);
    return null;
  }
}

type MarkdownNodeProps = NodeProps<ProseMirrorNode, string | string[]>;

// `String#trim` would also drop full-width spaces used to indent Japanese text
function trimBlankLines(text: string): string {
  return text.replaceAll(/^\n+|\n+$/g, "");
}

function formatListItem(marker: string, body: string): string {
  const indent = " ".repeat(marker.length);
  return `${marker}${trimBlankLines(body).replaceAll(/\n(?!\n)/g, `\n${indent}`)}\n`;
}

const markdownNodeMapping = {
  // The default escapes `&`, `<` and `>` as HTML entities
  text: ({ node }: MarkdownNodeProps) => node.text ?? "",
  // The default joins the children with commas
  heading: ({ node, children }: MarkdownNodeProps) => {
    const level = typeof node.attrs.level === "number" ? node.attrs.level : 2;
    return `\n${"#".repeat(level)} ${serializeChildrenToHTMLString(children).replaceAll("\n", " ")}\n`;
  },
  // The default writes `![null](...)` when there is no alt text
  image: ({ node }: MarkdownNodeProps) => {
    const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
    const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
    return `\n![${alt}](${src})\n`;
  },
  // The default flattens nested lists and ignores the start number of ordered lists
  listItem: ({ node, parent, children }: MarkdownNodeProps) => {
    if (parent?.type.name !== "orderedList") {
      return formatListItem("- ", serializeChildrenToHTMLString(children));
    }
    const start = typeof parent.attrs.start === "number" ? parent.attrs.start : 1;
    const number = start + parent.children.indexOf(node);
    return formatListItem(`${number}. `, serializeChildrenToHTMLString(children));
  },
};

/**
 * Uploaded images are stored as site-relative paths, which clients outside akabase cannot resolve.
 */
export function toAbsoluteUrl(url: string, origin: string): string;
export function toAbsoluteUrl(url: null, origin: string): null;
export function toAbsoluteUrl(url: string | null, origin: string): string | null;
export function toAbsoluteUrl(url: string | null, origin: string): string | null {
  if (url === null || !url.startsWith("/")) {
    return url;
  }
  return `${origin.replace(/\/$/, "")}${url}`;
}

function withAbsoluteImageSrc(content: JSONContent, origin: string): JSONContent {
  const src = content.attrs?.src;
  const isImage = content.type === "image" && typeof src === "string";
  const resolved = isImage
    ? { ...content, attrs: { ...content.attrs, src: toAbsoluteUrl(src, origin) } }
    : content;

  if (resolved.content === undefined) {
    return resolved;
  }

  return {
    ...resolved,
    content: resolved.content.map((child) => withAbsoluteImageSrc(child, origin)),
  };
}
