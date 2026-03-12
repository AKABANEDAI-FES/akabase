import { memo, useCallback, useId, useRef, useState } from "react";
import { Link2Icon } from "lucide-react";
import { Portal } from "@ark-ui/react/portal";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Button } from "@archive/ui/components/button";
import { Field } from "@archive/ui/components/field";
import { Input } from "@archive/ui/components/input";
import { Popover } from "@archive/ui/components/popover";
import { Flex, Stack } from "@archive/styled-system/jsx";
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
import { ToolbarButton } from "../toolbar-button";

export type LinkButtonProps = {
  editor?: Editor | null;
};

type SavedSelection = {
  from: number;
  to: number;
  empty: boolean;
  text: string;
  isLink: boolean;
  href: string;
};

export const LinkButton = memo<LinkButtonProps>(({ editor: providedEditor }) => {
  const { editor } = useTiptapEditor(providedEditor);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const savedSelectionRef = useRef<SavedSelection | null>(null);
  const triggerId = useId();

  const isDisabled = !editor || !editor.isEditable;

  const linkState = useEditorState({
    editor,
    selector: (ctx) => ({
      isActive: ctx.editor?.isActive("link") ?? false,
    }),
  });
  const isLinkActive = linkState?.isActive ?? false;

  const handleOpenChange = useCallback(
    (details: { open: boolean }) => {
      if (details.open && editor) {
        const { state } = editor;
        const { from, to } = state.selection;
        const { empty } = state.selection;

        if (editor.isActive("link")) {
          // Edit mode: extend mark range to select full link text
          editor.chain().focus().extendMarkRange("link").run();
          const updatedSelection = editor.state.selection;
          const linkText = editor.state.doc.textBetween(
            updatedSelection.from,
            updatedSelection.to,
            "",
          );
          const attrs = editor.getAttributes("link");

          setText(linkText);
          setUrl(attrs.href ?? "");
          savedSelectionRef.current = {
            from: updatedSelection.from,
            to: updatedSelection.to,
            empty: false,
            text: linkText,
            isLink: true,
            href: attrs.href ?? "",
          };
        } else if (!empty) {
          // Text selected, no link
          const selectedText = state.doc.textBetween(from, to, "");
          setText(selectedText);
          setUrl("");
          savedSelectionRef.current = {
            from,
            to,
            empty: false,
            text: selectedText,
            isLink: false,
            href: "",
          };
        } else {
          // No selection
          setText("");
          setUrl("");
          savedSelectionRef.current = {
            from,
            to,
            empty: true,
            text: "",
            isLink: false,
            href: "",
          };
        }
      }
      setOpen(details.open);
    },
    [editor],
  );

  // oxlint-disable-next-line max-statements
  const handleInsert = useCallback(() => {
    if (!editor || !url.trim()) {
      return;
    }

    const href = url.trim();
    const finalHref = /^https?:\/\//i.test(href) ? href : `https://${href}`;

    if (!URL.parse(finalHref)) {
      return;
    }

    const saved = savedSelectionRef.current;
    const displayText = text.trim() || finalHref;

    if (saved?.isLink) {
      // Edit existing link: restore selection, replace text + update href
      editor.chain().focus().setTextSelection({ from: saved.from, to: saved.to }).run();

      if (displayText !== saved.text) {
        // Text changed: delete old text, insert new with link mark
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent({
            type: "text",
            text: displayText,
            marks: [{ type: "link", attrs: { href: finalHref } }],
          })
          .run();
      } else {
        // Only URL changed
        editor.chain().focus().extendMarkRange("link").setLink({ href: finalHref }).run();
      }
    } else if (saved && !saved.empty) {
      // Has selection: apply link to selected text
      editor.chain().focus().setTextSelection({ from: saved.from, to: saved.to }).run();

      if (displayText !== saved.text) {
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent({
            type: "text",
            text: displayText,
            marks: [{ type: "link", attrs: { href: finalHref } }],
          })
          .run();
      } else {
        editor.chain().focus().setLink({ href: finalHref }).run();
      }
    } else {
      // No selection: insert new text with link
      if (saved) {
        editor.chain().focus().setTextSelection(saved.from).run();
      }
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: displayText,
          marks: [{ type: "link", attrs: { href: finalHref } }],
        })
        .run();
    }

    setOpen(false);
  }, [editor, text, url]);

  const handleRemove = useCallback(() => {
    if (!editor) {
      return;
    }
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  }, [editor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && url.trim()) {
        e.preventDefault();
        handleInsert();
      }
    },
    [handleInsert, url],
  );

  return (
    <Popover.Root
      open={open}
      onOpenChange={handleOpenChange}
      positioning={{ placement: "bottom" }}
      ids={{ trigger: triggerId }}
    >
      <Popover.Trigger asChild>
        <ToolbarButton
          label="リンク"
          disabled={isDisabled}
          isActive={isLinkActive}
          ids={{ trigger: triggerId }}
        >
          <Link2Icon />
        </ToolbarButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Header>
              <Popover.Title>リンクを挿入</Popover.Title>
            </Popover.Header>
            <Popover.Body>
              <Stack gap="3">
                <Field.Root>
                  <Field.Label>テキスト</Field.Label>
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="表示テキスト"
                    size="sm"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>URL</Field.Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="https://example.com"
                    size="sm"
                  />
                </Field.Root>
              </Stack>
            </Popover.Body>
            <Popover.Footer>
              <Flex gap="2" justify="space-between" width="full">
                {savedSelectionRef.current?.isLink ? (
                  <Button variant="outline" size="xs" onClick={handleRemove}>
                    リンクを解除
                  </Button>
                ) : (
                  <span />
                )}
                <Button variant="solid" size="xs" onClick={handleInsert} disabled={!url.trim()}>
                  {savedSelectionRef.current?.isLink ? "更新" : "挿入"}
                </Button>
              </Flex>
            </Popover.Footer>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
});

LinkButton.displayName = "LinkButton";
