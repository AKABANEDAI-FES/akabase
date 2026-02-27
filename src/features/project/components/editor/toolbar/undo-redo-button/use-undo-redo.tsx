// --- Icons ---
import { RedoIcon, UndoIcon } from "lucide-react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { useCallback } from "react";
// --- Hooks ---
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
import { isNodeTypeSelected } from "../../lib/tiptap-utils";
// --- Lib ---

export type UndoRedoAction = "undo" | "redo";

/**
 * Configuration for the history functionality
 */
export interface UseUndoRedoConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * The history action to perform (undo or redo).
   */
  action: UndoRedoAction;
  /**
   * Callback function called after a successful action execution.
   */
  onExecuted?: () => void;
}

export const UNDO_REDO_SHORTCUT_KEYS: Record<UndoRedoAction, string> = {
  undo: "mod+z",
  redo: "mod+shift+z",
};

export const historyActionLabels: Record<UndoRedoAction, string> = {
  undo: "元に戻す",
  redo: "やり直し",
};

export const historyIcons = {
  undo: UndoIcon,
  redo: RedoIcon,
};

/**
 * Checks if a history action can be executed
 */
export function canExecuteUndoRedoAction(editor: Editor | null, action: UndoRedoAction): boolean {
  if (!editor || !editor.isEditable) return false;
  if (isNodeTypeSelected(editor, ["image"])) return false;

  return action === "undo" ? editor.can().undo() : editor.can().redo();
}
export function useCanExecuteUndoRedoAction(
  editor: Editor | null,
  action: UndoRedoAction,
): boolean {
  const state = useEditorState({
    editor,
    selector(context) {
      const canExecute = canExecuteUndoRedoAction(context.editor, action);
      return { canExecute };
    },
  });

  return state?.canExecute ?? false;
}

/**
 * Executes a history action on the editor
 */
export function executeUndoRedoAction(editor: Editor | null, action: UndoRedoAction): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canExecuteUndoRedoAction(editor, action)) return false;

  const chain = editor.chain().focus();
  return action === "undo" ? chain.undo().run() : chain.redo().run();
}

/**
 * Custom hook that provides history functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MySimpleUndoButton() {
 *   const { isVisible, handleAction } = useHistory({ action: "undo" })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleAction}>Undo</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedRedoButton() {
 *   const { isVisible, handleAction, label } = useHistory({
 *     editor: myEditor,
 *     action: "redo",
 *     hideWhenUnavailable: true,
 *     onExecuted: () => console.log('Action executed!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleAction}
 *       aria-label={label}
 *     >
 *       Redo
 *     </MyButton>
 *   )
 * }
 * ```
 */
export function useUndoRedo(config: UseUndoRedoConfig) {
  const { editor: providedEditor, action, onExecuted } = config;

  const { editor } = useTiptapEditor(providedEditor);
  const canExecute = useCanExecuteUndoRedoAction(editor, action);

  const handleAction = useCallback(() => {
    if (!editor) return false;

    const success = executeUndoRedoAction(editor, action);
    if (success) {
      onExecuted?.();
    }
    return success;
  }, [editor, action, onExecuted]);

  return {
    handleAction,
    canExecute,
    label: historyActionLabels[action],
    shortcutKeys: UNDO_REDO_SHORTCUT_KEYS[action],
    Icon: historyIcons[action],
  };
}
