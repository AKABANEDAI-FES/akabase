import { Field } from "@ark-ui/react/field";
import type { ComponentProps } from "react";
import { styled } from "@archive/styled-system/jsx";
import { input } from "@archive/styled-system/recipes";

export type InputProps = ComponentProps<typeof Input>;
export const Input = styled(Field.Input, input);
