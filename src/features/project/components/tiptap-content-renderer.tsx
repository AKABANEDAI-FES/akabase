import { generateHTML } from "@tiptap/core";
import { useMemo } from "react";
import { Box } from "styled-system/jsx";
import { richTextEditor } from "styled-system/recipes";
import { editorExtensions } from "./editor/extensions";
import { cx } from "styled-system/css";

interface TipTapContentRendererProps {
  content: unknown | null;
  className?: string;
}

/**
 * Renders TipTap JSON content as formatted HTML
 * Uses the same extensions as the editor to ensure consistent rendering
 */
export function TipTapContentRenderer({ content, className }: TipTapContentRendererProps) {
  const html = useMemo(() => {
    if (!content) return null;

    try {
      return generateHTML(content, editorExtensions);
    } catch (error) {
      console.error("Failed to render TipTap content:", error);
      return null;
    }
  }, [content]);

  const classes = richTextEditor();

  if (!html) {
    return <Box color="fg.muted">未設定</Box>;
  }

  return (
    <Box className={cx(classes.content, className)}>
      <div className="ProseMirror" dangerouslySetInnerHTML={{ __html: html }} />
    </Box>
  );
}
