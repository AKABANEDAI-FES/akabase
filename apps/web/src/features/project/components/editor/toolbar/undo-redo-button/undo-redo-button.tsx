import { memo, useCallback } from "react";
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
import type { UseUndoRedoConfig } from "./use-undo-redo";
import { useUndoRedo } from "./use-undo-redo";
import type { ToolbarButtonProps } from "../toolbar-button";
import { ToolbarButton } from "../toolbar-button";

export type UndoRedoButtonProps = Omit<ToolbarButtonProps, "label" | "type"> & UseUndoRedoConfig;

/**
 * Button component for triggering undo/redo actions in a Tiptap editor.
 *
 * For custom button implementations, use the `useHistory` hook instead.
 */
export const UndoRedoButton = memo<UndoRedoButtonProps>(
  ({ editor: providedEditor, action, onExecuted, onClick, children, ...buttonProps }) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { handleAction, label, canExecute, Icon } = useUndoRedo({
      editor,
      action,
      onExecuted,
    });

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        handleAction();
      },
      [handleAction, onClick],
    );

    return (
      <ToolbarButton label={label} disabled={!canExecute} onClick={handleClick} {...buttonProps}>
        {children ?? <Icon />}
      </ToolbarButton>
    );
  },
);
