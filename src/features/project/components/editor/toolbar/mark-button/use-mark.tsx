// --- Icons ---
import { BoldIcon, ItalicIcon, StrikethroughIcon, UnderlineIcon } from "lucide-react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
// --- Lib ---
import { isMarkInSchema, isNodeTypeSelected } from "../../lib/tiptap-utils";

export type Mark = "bold" | "italic" | "strike" | "underline";

/**
 * Configuration for the mark functionality
 */
export interface UseMarkConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * The type of mark to toggle
   */
  type: Mark;
  /**
   * Whether the button should hide when mark is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Callback function called after a successful mark toggle.
   */
  onToggled?: () => void;
}

export const markIcons = {
  bold: BoldIcon,
  italic: ItalicIcon,
  underline: UnderlineIcon,
  strike: StrikethroughIcon,
};

export const MARK_SHORTCUT_KEYS: Record<Mark, string> = {
  bold: "mod+b",
  italic: "mod+i",
  underline: "mod+u",
  strike: "mod+shift+s",
};

/**
 * Checks if a mark can be toggled in the current editor state
 */
export function canToggleMark(editor: Editor | null, type: Mark): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isMarkInSchema(type, editor) || isNodeTypeSelected(editor, ["image"])) return false;

  return editor.can().toggleMark(type);
}
export function useCanToggleMark(editor: Editor | null, type: Mark): boolean {
  const state = useEditorState({
    editor,
    selector(context) {
      const canToggle = canToggleMark(context.editor, type);
      return { canToggle };
    },
  });

  return state?.canToggle ?? false;
}

/**
 * Checks if a mark is currently active
 */
export function isMarkActive(editor: Editor | null, type: Mark): boolean {
  if (!editor || !editor.isEditable) return false;
  return editor.isActive(type);
}
export function useIsMarkActive(editor: Editor | null, type: Mark): boolean {
  const state = useEditorState({
    editor,
    selector(context) {
      const isActive = isMarkActive(context.editor, type);
      return { isActive };
    },
  });

  return state?.isActive ?? false;
}

/**
 * Toggles a mark in the editor
 */
export function toggleMark(editor: Editor | null, type: Mark): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canToggleMark(editor, type)) return false;

  return editor.chain().focus().toggleMark(type).run();
}

/**
 * Determines if the mark button should be shown
 */
export function shouldShowButton(props: {
  editor: Editor | null;
  type: Mark;
  hideWhenUnavailable: boolean;
}): boolean {
  const { editor, type, hideWhenUnavailable } = props;

  if (!editor || !editor.isEditable) return false;
  if (!isMarkInSchema(type, editor)) return false;

  if (hideWhenUnavailable && !editor.isActive("code")) {
    return canToggleMark(editor, type);
  }

  return true;
}

/**
 * Gets the formatted mark name
 */
export function getFormattedMarkName(type: Mark): string {
  const names: Record<Mark, string> = {
    bold: "太字",
    italic: "斜体",
    underline: "下線",
    strike: "取り消し線",
  };
  return names[type];
}

/**
 * Custom hook that provides mark functionality for Tiptap editor
 */
export function useMark(config: UseMarkConfig) {
  const { editor: providedEditor, type, hideWhenUnavailable = false, onToggled } = config;

  const { editor } = useTiptapEditor(providedEditor);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const canToggle = useCanToggleMark(editor, type);
  const isActive = useIsMarkActive(editor, type);

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

  const handleMark = useCallback(() => {
    if (!editor) return false;

    const success = toggleMark(editor, type);
    if (success) {
      onToggled?.();
    }
    return success;
  }, [editor, type, onToggled]);

  return {
    isVisible,
    isActive,
    handleMark,
    canToggle,
    label: getFormattedMarkName(type),
    shortcutKeys: MARK_SHORTCUT_KEYS[type],
    Icon: markIcons[type],
  };
}
