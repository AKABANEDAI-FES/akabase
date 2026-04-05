import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "@akabase/styled-system/jsx";
import { icon } from "@akabase/styled-system/recipes";

export type IconProps = ComponentProps<typeof Icon>;
export const Icon = styled(ark.svg, icon, {
  defaultProps: { asChild: true },
});
