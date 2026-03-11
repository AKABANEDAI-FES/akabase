import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "@archive/styled-system/jsx";
import { group } from "@archive/styled-system/recipes";

export type GroupProps = ComponentProps<typeof Group>;
export const Group = styled(ark.div, group);
