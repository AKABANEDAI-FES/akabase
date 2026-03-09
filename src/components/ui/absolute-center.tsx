import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "@archive/styled-system/jsx";
import { absoluteCenter } from "@archive/styled-system/recipes";

export type AbsoluteCenterProps = ComponentProps<typeof AbsoluteCenter>;
export const AbsoluteCenter = styled(ark.div, absoluteCenter);
