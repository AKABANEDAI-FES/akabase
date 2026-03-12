import { memo, useCallback } from "react";
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
import type { UseBlockquoteConfig } from "./use-blockquote";
import { useBlockquote } from "./use-blockquote";
import type { ToolbarButtonProps } from "../toolbar-button";
import { ToolbarButton } from "../toolbar-button";

export type BlockquoteButtonProps = Omit<ToolbarButtonProps, "label" | "type"> &
  UseBlockquoteConfig;

/**
 * Button component for toggling blockquote in a Tiptap editor.
 *
 * For custom button implementations, use the `useBlockquote` hook instead.
 */
export const BlockquoteButton = memo<BlockquoteButtonProps>(
  ({
    editor: providedEditor,
    hideWhenUnavailable = false,
    onToggled,
    onClick,
    children,
    ...buttonProps
  }) => {
    const { editor } = useTiptapEditor(providedEditor);
    const { isVisible, canToggle, isActive, handleToggle, label, Icon } = useBlockquote({
      editor,
      hideWhenUnavailable,
      onToggled,
    });

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        handleToggle();
      },
      [handleToggle, onClick],
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

BlockquoteButton.displayName = "BlockquoteButton";
