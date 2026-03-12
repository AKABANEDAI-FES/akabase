import { memo, useCallback } from "react";
import type { UseMarkConfig } from "./use-mark";
import { useMark } from "./use-mark";
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
import type { ToolbarButtonProps } from "../toolbar-button";
import { ToolbarButton } from "../toolbar-button";

export type MarkButtonProps = Omit<ToolbarButtonProps, "label" | "type"> & UseMarkConfig;

/**
 * Button component for toggling marks in a Tiptap editor.
 *
 * For custom button implementations, use the `useMark` hook instead.
 */
export const MarkButton = memo<MarkButtonProps>(
  ({
    editor: providedEditor,
    type,
    hideWhenUnavailable = false,
    onToggled,
    onClick,
    children,
    ...buttonProps
  }) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, handleMark, label, canToggle, isActive, Icon } = useMark({
      editor,
      type,
      hideWhenUnavailable,
      onToggled,
    });

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        handleMark();
      },
      [handleMark, onClick],
    );

    if (!isVisible) {
      return null;
    }

    return (
      <ToolbarButton
        label={label}
        disabled={!canToggle}
        aria-pressed={isActive}
        onClick={handleClick}
        {...buttonProps}
      >
        {children ?? <Icon />}
      </ToolbarButton>
    );
  },
);

MarkButton.displayName = "MarkButton";
