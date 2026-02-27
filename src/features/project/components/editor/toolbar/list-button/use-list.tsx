// --- Icons ---
import { ListIcon, ListOrderedIcon } from "lucide-react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
// --- Lib ---
import { isNodeInSchema, isNodeTypeSelected } from "../../lib/tiptap-utils";

export type ListType = "bulletList" | "orderedList";

/**
 * Configuration for the list functionality
 */
export interface UseListConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * The type of list to toggle
   */
  type: ListType;
  /**
   * Whether the button should hide when list is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Callback function called after a successful list toggle.
   */
  onToggled?: () => void;
}

export const listIcons = {
  bulletList: ListIcon,
  orderedList: ListOrderedIcon,
};

export const LIST_SHORTCUT_KEYS: Record<ListType, string> = {
  bulletList: "mod+shift+8",
  orderedList: "mod+shift+7",
};

/**
 * Checks if a list can be toggled in the current editor state
 */
export function canToggleList(editor: Editor | null, type: ListType): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema(type, editor) || isNodeTypeSelected(editor, ["image"])) return false;

  return editor.can().toggleList(type, "listItem");
}
export function useCanToggleList(editor: Editor | null, type: ListType): boolean {
  const state = useEditorState({
    editor,
    selector(context) {
      const canToggle = canToggleList(context.editor, type);
      return { canToggle };
    },
  });

  return state?.canToggle ?? false;
}

/**
 * Checks if a list is currently active
 */
export function isListActive(editor: Editor | null, type: ListType): boolean {
  if (!editor || !editor.isEditable) return false;
  return editor.isActive(type);
}
export function useIsListActive(editor: Editor | null, type: ListType): boolean {
  const state = useEditorState({
    editor,
    selector(context) {
      const isActive = isListActive(context.editor, type);
      return { isActive };
    },
  });

  return state?.isActive ?? false;
}

/**
 * Toggles a list in the editor
 */
export function toggleList(editor: Editor | null, type: ListType): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canToggleList(editor, type)) return false;

  try {
    const toggleMap: Record<ListType, () => void> = {
      bulletList: () => editor.chain().focus().toggleBulletList().run(),
      orderedList: () => editor.chain().focus().toggleOrderedList().run(),
    };

    toggleMap[type]();
    return true;
  } catch {
    return false;
  }
}

/**
 * Determines if the list button should be shown
 */
export function shouldShowButton(props: {
  editor: Editor | null;
  type: ListType;
  hideWhenUnavailable: boolean;
}): boolean {
  const { editor, type, hideWhenUnavailable } = props;

  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema(type, editor)) return false;

  if (hideWhenUnavailable && !editor.isActive("code")) {
    return canToggleList(editor, type);
  }

  return true;
}

/**
 * Gets the formatted list name
 */
export function getFormattedListName(type: ListType): string {
  const names: Record<ListType, string> = {
    bulletList: "箇条書きリスト",
    orderedList: "番号付きリスト",
  };
  return names[type];
}

/**
 * Custom hook that provides list functionality for Tiptap editor
 */
export function useList(config: UseListConfig) {
  const { editor: providedEditor, type, hideWhenUnavailable = false, onToggled } = config;

  const { editor } = useTiptapEditor(providedEditor);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const canToggle = useCanToggleList(editor, type);
  const isActive = useIsListActive(editor, type);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      setIsVisible(shouldShowButton({ editor, type, hideWhenUnavailable }));
    };

    handleSelectionUpdate();

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, type, hideWhenUnavailable]);

  const handleToggle = useCallback(() => {
    if (!editor) return false;

    const success = toggleList(editor, type);
    if (success) {
      onToggled?.();
    }
    return success;
  }, [editor, type, onToggled]);

  return {
    isVisible,
    isActive,
    handleToggle,
    canToggle,
    label: getFormattedListName(type),
    shortcutKeys: LIST_SHORTCUT_KEYS[type],
    Icon: listIcons[type],
  };
}
