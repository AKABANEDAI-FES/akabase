import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "@akabase/styled-system/jsx";
import { group } from "@akabase/styled-system/recipes";

export type GroupProps = ComponentProps<typeof Group>;
export const Group = styled(ark.div, group);
