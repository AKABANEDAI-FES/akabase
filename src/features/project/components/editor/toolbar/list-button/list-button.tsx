import { memo, useCallback } from "react";
import type { UseListConfig } from "./use-list";
import { useList } from "./use-list";
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
import type { ToolbarButtonProps } from "../toolbar-button";
import { ToolbarButton } from "../toolbar-button";

export type ListButtonProps = Omit<ToolbarButtonProps, "label" | "type"> & UseListConfig;

/**
 * Button component for toggling lists in a Tiptap editor.
 *
 * For custom button implementations, use the `useList` hook instead.
 */
export const ListButton = memo<ListButtonProps>(
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
    const { isVisible, handleToggle, label, canToggle, isActive, Icon } = useList({
      editor,
      type,
      hideWhenUnavailable,
      onToggled,
    });

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
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

ListButton.displayName = "ListButton";
