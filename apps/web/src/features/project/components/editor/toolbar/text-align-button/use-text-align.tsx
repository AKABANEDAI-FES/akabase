// --- Icons ---
import { AlignCenterIcon, AlignJustifyIcon, AlignLeftIcon, AlignRightIcon } from "lucide-react";
import { useEditorState } from "@tiptap/react";
import type { ChainedCommands, Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
// --- Lib ---
import { isExtensionAvailable, isNodeTypeSelected } from "../../lib/tiptap-utils";

export type TextAlign = "left" | "center" | "right" | "justify";

/**
 * Configuration for the text align functionality
 */
export type UseTextAlignConfig = {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * The text alignment to apply.
   */
  align: TextAlign;
  /**
   * Whether the button should hide when alignment is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Callback function called after a successful alignment change.
   */
  onAligned?: () => void;
};

export const TEXT_ALIGN_SHORTCUT_KEYS: Record<TextAlign, string> = {
  left: "mod+shift+l",
  center: "mod+shift+e",
  right: "mod+shift+r",
  justify: "mod+shift+j",
};

export const textAlignIcons = {
  left: AlignLeftIcon,
  center: AlignCenterIcon,
  right: AlignRightIcon,
  justify: AlignJustifyIcon,
};

export const textAlignLabels: Record<TextAlign, string> = {
  left: "左揃え",
  center: "中央揃え",
  right: "右揃え",
  justify: "両端揃え",
};

/**
 * Checks if text alignment can be performed in the current editor state
 */
export function canSetTextAlign(editor: Editor | null, align: TextAlign): boolean {
  if (!editor || !editor.isEditable) {
    return false;
  }
  if (
    !isExtensionAvailable(editor, "textAlign") ||
    isNodeTypeSelected(editor, ["image", "horizontalRule"])
  ) {
    return false;
  }

  return editor.can().setTextAlign(align);
}
export function useCanSetTextAlign(editor: Editor | null, align: TextAlign): boolean {
  const state = useEditorState({
    editor,
    selector(context) {
      const canAlign = canSetTextAlign(context.editor, align);
      return { canAlign };
    },
  });

  return state?.canAlign ?? false;
}

export function hasSetTextAlign(commands: ChainedCommands): commands is ChainedCommands & {
  setTextAlign: (align: TextAlign) => ChainedCommands;
} {
  return "setTextAlign" in commands;
}

/**
 * Checks if the text alignment is currently active
 */
export function isTextAlignActive(editor: Editor | null, align: TextAlign): boolean {
  if (!editor || !editor.isEditable) {
    return false;
  }
  return editor.isActive({ textAlign: align });
}
export function useIsTextAlignActive(editor: Editor | null, align: TextAlign): boolean {
  const state = useEditorState({
    editor,
    selector(context) {
      const isActive = isTextAlignActive(context.editor, align);
      return { isActive };
    },
  });

  return state?.isActive ?? false;
}

/**
 * Sets text alignment in the editor
 */
export function setTextAlign(editor: Editor | null, align: TextAlign): boolean {
  if (!editor || !editor.isEditable) {
    return false;
  }
  if (!canSetTextAlign(editor, align)) {
    return false;
  }

  const chain = editor.chain().focus();
  if (hasSetTextAlign(chain)) {
    return chain.setTextAlign(align).run();
  }

  return false;
}

/**
 * Determines if the text align button should be shown
 */
export function shouldShowButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
  align: TextAlign;
}): boolean {
  const { editor, hideWhenUnavailable, align } = props;

  if (!editor) {
    return false;
  }
  if (!isExtensionAvailable(editor, "textAlign")) {
    return false;
  }

  if (hideWhenUnavailable && !editor.isActive("code")) {
    return canSetTextAlign(editor, align);
  }

  return true;
}

/**
 * Custom hook that provides text align functionality for Tiptap editor
 */
export function useTextAlign(config: UseTextAlignConfig) {
  const { editor: providedEditor, align, hideWhenUnavailable = false, onAligned } = config;

  const { editor } = useTiptapEditor(providedEditor);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const canAlign = useCanSetTextAlign(editor, align);
  const isActive = useIsTextAlignActive(editor, align);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleSelectionUpdate = () => {
      setIsVisible(shouldShowButton({ editor, align, hideWhenUnavailable }));
    };

    handleSelectionUpdate();

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, hideWhenUnavailable, align]);

  const handleTextAlign = useCallback(() => {
    if (!editor) {
      return false;
    }

    const success = setTextAlign(editor, align);
    if (success) {
      onAligned?.();
    }
    return success;
  }, [editor, align, onAligned]);

  return {
    isVisible,
    isActive,
    handleTextAlign,
    canAlign,
    label: textAlignLabels[align],
    shortcutKeys: TEXT_ALIGN_SHORTCUT_KEYS[align],
    Icon: textAlignIcons[align],
  };
}
