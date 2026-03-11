import type { ComponentProps } from "react";
import { styled } from "@archive/styled-system/jsx";
import { heading } from "@archive/styled-system/recipes";
import type { HeadingVariantProps } from "@archive/styled-system/recipes";
import type { StyledComponent } from "@archive/styled-system/types";

type Props = HeadingVariantProps & { as?: React.ElementType };

export type HeadingProps = ComponentProps<typeof Heading>;
export const Heading = styled("h2", heading) as StyledComponent<"h2", Props>;
