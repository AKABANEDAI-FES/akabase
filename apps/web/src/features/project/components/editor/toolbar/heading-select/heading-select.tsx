import {
  ChevronDownIcon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  HeadingIcon,
  PilcrowIcon,
} from "lucide-react";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
import { css } from "@akabase/styled-system/css";
import { HStack } from "@akabase/styled-system/jsx";
import { Menu } from "@akabase/ui/components/menu";
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
import { findNodePosition, isValidPosition } from "../../lib/tiptap-utils";
import { Portal } from "@ark-ui/react";

export type Level = 2 | 3 | 4;

type HeadingOption = {
  value: string;
  label: string;
  level: Level | null;
  Icon: typeof Heading2Icon;
};

const headingOptions: HeadingOption[] = [
  { value: "paragraph", label: "本文", level: null, Icon: PilcrowIcon },
  { value: "h2", label: "見出し2", level: 2, Icon: Heading2Icon },
  { value: "h3", label: "見出し3", level: 3, Icon: Heading3Icon },
  { value: "h4", label: "見出し4", level: 4, Icon: Heading4Icon },
];

// oxlint-disable-next-line max-statements
function toggleHeading(editor: Editor | null, level: Level): boolean {
  if (!editor || !editor.isEditable) {
    return false;
  }

  try {
    const { view } = editor;
    let { state } = view;
    let { tr } = state;

    // No selection, find the cursor position
    if (state.selection.empty || state.selection instanceof TextSelection) {
      const pos = findNodePosition({
        editor,
        node: state.selection.$anchor.node(1),
      })?.pos;
      if (!isValidPosition(pos)) {
        return false;
      }

      tr = tr.setSelection(NodeSelection.create(state.doc, pos));
      view.dispatch(tr);
      ({ state } = view);
    }

    const { selection } = state;
    let chain = editor.chain().focus();

    // Handle NodeSelection
    if (selection instanceof NodeSelection) {
      const firstChild = selection.node.firstChild?.firstChild;
      const lastChild = selection.node.lastChild?.lastChild;

      const from = firstChild ? selection.from + firstChild.nodeSize : selection.from + 1;

      const to = lastChild ? selection.to - lastChild.nodeSize : selection.to - 1;

      const resolvedFrom = state.doc.resolve(from);
      const resolvedTo = state.doc.resolve(to);

      chain = chain.setTextSelection(TextSelection.between(resolvedFrom, resolvedTo)).clearNodes();
    }

    const isActive = editor.isActive("heading", { level });

    const toggle = isActive ? chain.setNode("paragraph") : chain.setNode("heading", { level });

    toggle.run();
    editor.chain().focus().selectTextblockEnd().run();

    return true;
  } catch {
    return false;
  }
}

function getActiveHeadingValue(editor: Editor | null): string | null {
  if (!editor || !editor.isEditable) {
    return null;
  }

  // Check if paragraph is active (not heading)
  if (editor.isActive("paragraph")) {
    return "paragraph";
  }

  // Check for active heading level
  for (const option of headingOptions) {
    if (option.level && editor.isActive("heading", { level: option.level })) {
      return option.value;
    }
  }

  return null;
}

export type HeadingSelectProps = {
  editor?: Editor | null;
  levels?: Level[];
};

export function HeadingSelect({ editor: providedEditor, levels = [2, 3, 4] }: HeadingSelectProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const [activeValue, setActiveValue] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleUpdate = () => {
      setActiveValue(getActiveHeadingValue(editor));
    };

    handleUpdate();
    editor.on("selectionUpdate", handleUpdate);
    editor.on("transaction", handleUpdate);

    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("transaction", handleUpdate);
    };
  }, [editor]);

  const handleSelect = useCallback(
    (value: string) => {
      if (!editor) {
        return;
      }

      const selectedOption = headingOptions.find((o) => o.value === value);
      if (!selectedOption) {
        return;
      }

      if (selectedOption.level === null) {
        // Paragraph option selected
        editor.chain().focus().setParagraph().run();
      } else {
        toggleHeading(editor, selectedOption.level);
      }
    },
    [editor],
  );

  const filteredOptions = headingOptions.filter(
    (option) => option.level === null || levels.includes(option.level),
  );

  const TriggerIcon = () => {
    const option = headingOptions.find((o) => o.value === activeValue);
    return option ? <option.Icon className={css({ color: "fg.default" })} /> : <HeadingIcon />;
  };

  return (
    <Menu.Root
      positioning={{ sameWidth: false }}
      onSelect={(details) => handleSelect(details.value)}
      size="xs"
    >
      <Menu.Trigger
        aria-label="見出しレベルを選択"
        className={css({
          display: "inline-flex",
          alignItems: "center",
          gap: "1.5",
          cursor: "pointer",
          borderRadius: "l2",
          px: "2",
          minH: "8",
          minW: "8",
          _hover: {
            background: "gray.a3",
          },
          "& :where(svg)": {
            width: "3.5",
            height: "3.5",
          },
        })}
      >
        <TriggerIcon />
        <ChevronDownIcon />
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner style={{ zIndex: "1500" }}>
          <Menu.Content minW="0" w="fit-content">
            {filteredOptions.map((option) => (
              <Menu.Item
                key={option.value}
                value={option.value}
                aria-pressed={activeValue === option.value}
                css={{
                  _pressed: {
                    background: "gray.surface.bg.active",
                  },
                }}
              >
                <HStack gap="2">
                  <option.Icon />
                  {option.label}
                </HStack>
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
