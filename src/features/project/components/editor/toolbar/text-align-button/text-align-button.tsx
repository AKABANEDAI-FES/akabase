import { memo, useCallback } from "react";
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
import type { UseTextAlignConfig } from "./use-text-align";
import { useTextAlign } from "./use-text-align";
import type { ToolbarButtonProps } from "../toolbar-button";
import { ToolbarButton } from "../toolbar-button";

export type TextAlignButtonProps = Omit<ToolbarButtonProps, "label" | "type"> & UseTextAlignConfig;

/**
 * Button component for setting text alignment in a Tiptap editor.
 *
 * For custom button implementations, use the `useTextAlign` hook instead.
 */
export const TextAlignButton = memo<TextAlignButtonProps>(
  ({
    editor: providedEditor,
    align,
    hideWhenUnavailable = false,
    onAligned,
    onClick,
    children,
    ...buttonProps
  }) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, handleTextAlign, label, canAlign, isActive, Icon } = useTextAlign({
      editor,
      align,
      hideWhenUnavailable,
      onAligned,
    });

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        handleTextAlign();
      },
      [handleTextAlign, onClick],
    );

    if (!isVisible) {
      return null;
    }

    return (
      <ToolbarButton
        label={label}
        disabled={!canAlign}
        aria-pressed={isActive}
        onClick={handleClick}
        {...buttonProps}
      >
        {children ?? <Icon />}
      </ToolbarButton>
    );
  },
);

TextAlignButton.displayName = "TextAlignButton";
