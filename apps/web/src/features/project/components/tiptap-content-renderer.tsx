import { generateHTML } from "@tiptap/core";
import { useSyncExternalStore } from "react";
import { Box } from "@archive/styled-system/jsx";
import { richTextEditor } from "@archive/styled-system/recipes";
import { editorExtensions } from "./editor/extensions";
import { cx } from "@archive/styled-system/css";
import { Spinner } from "@archive/ui/components/spinner";

type TipTapContentRendererProps = {
  content: unknown;
  className?: string;
};

/**
 * Renders TipTap JSON content as formatted HTML
 * Uses the same extensions as the editor to ensure consistent rendering
 */
export function TipTapContentRenderer({ content, className }: TipTapContentRendererProps) {
  const Generator = useContentGenerator();

  const classes = richTextEditor();

  return (
    <Box className={cx(classes.content, className)}>
      <Generator content={content} />
    </Box>
  );
}

type ContentGenerator = ({ content }: { content: unknown }) => React.ReactNode;
// oxlint-disable-next-line no-empty-function
const noop = () => () => {};
const GenerateNode: ContentGenerator = ({ content }) => {
  if (!content) {
    return <Box color="fg.muted">未設定</Box>;
  }
  try {
    const html = generateHTML(content, editorExtensions);
    return <Box className="ProseMirror" dangerouslySetInnerHTML={{ __html: html }} />;
  } catch (error) {
    console.error("Failed to render TipTap content:", error);
    return <Box color="error">コンテンツの表示に失敗しました</Box>;
  }
};
const PlaceholderNode = () => {
  return <Spinner mx="auto" size="lg" />;
};

function useContentGenerator() {
  return useSyncExternalStore<ContentGenerator>(
    noop,
    () => GenerateNode,
    () => PlaceholderNode,
  );
}
