import type { IconButtonProps } from "@/components/ui";
import { IconButton, Tooltip } from "@/components/ui";

export type ToolbarButtonProps = IconButtonProps & {
  label: string;
  isActive?: boolean;
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
    <Tooltip content={label} disabled={disabled} positioning={{ placement: "top" }}>
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
