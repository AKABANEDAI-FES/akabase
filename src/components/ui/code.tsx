import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "@archive/styled-system/jsx";
import { code } from "@archive/styled-system/recipes";

export type CodeProps = ComponentProps<typeof Code>;
export const Code = styled(ark.code, code);
