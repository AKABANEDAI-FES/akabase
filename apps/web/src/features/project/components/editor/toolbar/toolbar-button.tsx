import type { IconButtonProps } from "@akabase/ui/components/icon-button";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Tooltip } from "@akabase/ui/components/tooltip";
import type { TooltipRootProps } from "@ark-ui/react";

export type ToolbarButtonProps = IconButtonProps & {
  label: string;
  isActive?: boolean;
  ids?: TooltipRootProps["ids"];
};

/**
 * Reusable toolbar button component with active/disabled states and tooltip
 */
export function ToolbarButton({
  children,
  label,
  isActive = false,
  disabled = false,
  ...props
}: ToolbarButtonProps) {
  return (
    <Tooltip content={label} disabled={disabled} positioning={{ placement: "top" }} ids={props.ids}>
      <IconButton
        aria-pressed={isActive}
        disabled={disabled}
        aria-label={label}
        type="button"
        {...props}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}
