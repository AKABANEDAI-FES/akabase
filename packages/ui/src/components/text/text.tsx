import type { ComponentProps } from "react";
import { styled } from "@akabase/styled-system/jsx";
import { text } from "@akabase/styled-system/recipes";
import type { TextVariantProps } from "@akabase/styled-system/recipes";
import type { StyledComponent } from "@akabase/styled-system/types";

type Props = TextVariantProps & { as?: React.ElementType };

export type TextProps = ComponentProps<typeof Text>;
export const Text = styled("p", text) as StyledComponent<"p", Props>;
