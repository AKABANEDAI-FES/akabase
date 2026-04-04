import { Field } from "@ark-ui/react/field";
import type { ComponentProps } from "react";
import { styled } from "@akabase/styled-system/jsx";
import { input } from "@akabase/styled-system/recipes";

export type InputProps = ComponentProps<typeof Input>;
export const Input = styled(Field.Input, input);
