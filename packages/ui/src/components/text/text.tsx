import type { ComponentProps } from "react";
import { styled } from "@archive/styled-system/jsx";
import { text } from "@archive/styled-system/recipes";
import type { TextVariantProps } from "@archive/styled-system/recipes";
import type { StyledComponent } from "@archive/styled-system/types";

type Props = TextVariantProps & { as?: React.ElementType };

export type TextProps = ComponentProps<typeof Text>;
export const Text = styled("p", text) as StyledComponent<"p", Props>;
