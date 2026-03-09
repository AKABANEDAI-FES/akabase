import { Field } from "@ark-ui/react/field";
import type { ComponentProps } from "react";
import { styled } from "@archive/styled-system/jsx";
import { textarea } from "@archive/styled-system/recipes";

export type TextareaProps = ComponentProps<typeof Textarea>;
export const Textarea = styled(Field.Textarea, textarea);
