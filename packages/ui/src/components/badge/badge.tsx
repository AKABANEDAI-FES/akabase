import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "@akabase/styled-system/jsx";
import { badge } from "@akabase/styled-system/recipes";

export type BadgeProps = ComponentProps<typeof Badge>;
export const Badge = styled(ark.div, badge);
