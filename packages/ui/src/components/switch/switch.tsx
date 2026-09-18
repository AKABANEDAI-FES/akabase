"use client";
import { ark } from "@ark-ui/react";
import { Switch, useSwitchContext } from "@ark-ui/react/switch";
import { forwardRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { createStyleContext, styled } from "@akabase/styled-system/jsx";
import { switchRecipe } from "@akabase/styled-system/recipes";

const { withProvider, withContext } = createStyleContext(switchRecipe);

export type RootProps = ComponentProps<typeof Root>;
export const Root = withProvider(Switch.Root, "root");
export const RootProvider = withProvider(Switch.RootProvider, "root");
export const Label = withContext(Switch.Label, "label");
export const Thumb = withContext(Switch.Thumb, "thumb");
export const { HiddenInput } = Switch;

export const Control = withContext(Switch.Control, "control", {
  defaultProps: { children: <Thumb /> },
});

export { SwitchContext as Context } from "@ark-ui/react/switch";

type IndicatorProps = {
  fallback?: ReactNode | undefined;
} & ComponentProps<typeof StyledIndicator>;

const StyledIndicator = withContext(ark.span, "indicator");
export const Indicator = forwardRef<HTMLSpanElement, IndicatorProps>(
  function Indicator(props, ref) {
    const { fallback, children, ...rest } = props;
    const api = useSwitchContext();
    return (
      <StyledIndicator ref={ref} data-checked={api.checked ? "" : undefined} {...rest}>
        {api.checked ? children : fallback}
      </StyledIndicator>
    );
  },
);

type ThumbIndicatorProps = {
  fallback?: ReactNode | undefined;
} & ComponentProps<typeof StyledThumbIndicator>;

const StyledThumbIndicator = styled(ark.span);
export const ThumbIndicator = forwardRef<HTMLSpanElement, ThumbIndicatorProps>(
  function SwitchThumbIndicator(props, ref) {
    const { fallback, children, ...rest } = props;
    const api = useSwitchContext();
    return (
      <StyledThumbIndicator ref={ref} data-checked={api.checked ? "" : undefined} {...rest}>
        {api.checked ? children : fallback}
      </StyledThumbIndicator>
    );
  },
);
