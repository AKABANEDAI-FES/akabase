import { z } from "zod";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import type { JSONContent } from "@tiptap/core";
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
