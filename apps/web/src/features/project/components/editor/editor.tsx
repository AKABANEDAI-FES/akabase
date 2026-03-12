import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import { Toolbar } from "./toolbar";
import { editorExtensions } from "./extensions";
import { richTextEditor } from "@archive/styled-system/recipes";
import { Placeholder } from "@tiptap/extensions";
import { Dialog } from "@archive/ui/components/dialog";
import type { ImageScope } from "@archive/domain/shared/image";
import { Portal } from "@ark-ui/react";
import { Box } from "@archive/styled-system/jsx";
import { InPortal, OutPortal, createHtmlPortalNode } from "react-reverse-portal";

export type RichTextEditorProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  imageScope: ImageScope;
};

/**
 * Rich text editor component using Tiptap
 * Controlled component that works with TanStack Form
 */
export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  invalid = false,
  disabled = false,
  imageScope,
}: RichTextEditorProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const editor = useEditor({
    extensions: [
      ...editorExtensions,
      Placeholder.configure({
        placeholder,
      }),
    ],
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
      },
    },
    content: value ?? undefined,
    immediatelyRender: false, // Prevent SSR hydration mismatches
    onUpdate: ({ editor }) => {
      // Return null if editor is empty, otherwise return JSON
      const json = editor.isEmpty ? null : editor.getJSON();
      onChange(json);
    },
    onBlur: () => {
      onBlur?.();
    },
    editable: !disabled,
  });

  // Sync external value changes (when form resets)
  useEffect(() => {
    if (!editor || editor.isFocused) {
      return;
    }

    const currentContent = editor.isEmpty ? null : editor.getJSON();
    const valueString = value ? JSON.stringify(value) : null;
    const currentString = currentContent ? JSON.stringify(currentContent) : null;

    if (valueString !== currentString) {
      editor.commands.setContent(value ?? "", { emitUpdate: false });
    }
  }, [editor, value]);

  const classes = richTextEditor();

  const portalNode = useMemo(() => createHtmlPortalNode(), []); // Create a portal node for the toolbar

  return (
    <EditorContext value={{ editor }}>
      <InPortal node={portalNode}>
        <Box height="full" className={classes.root} data-invalid={invalid} data-disabled={disabled}>
          <Toolbar
            className={classes.toolbar}
            maximized={isMaximized}
            toggleMaximize={() => setIsMaximized((prev) => !prev)}
            imageScope={imageScope}
          />
          <div className={classes.content}>
            <EditorContent editor={editor} />
          </div>
        </Box>
      </InPortal>
      {!isMaximized && (
        <Box css={{ "& > *": { height: "sm" } }}>
          <OutPortal node={portalNode} />
        </Box>
      )}
      <Dialog.Root open={isMaximized} size="cover" lazyMount unmountOnExit>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content py="0" css={{ "& > *": { height: "full" } }}>
              <OutPortal node={portalNode} />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </EditorContext>
  );
}
