import { Field } from "@ark-ui/react/field";
import type { ComponentProps } from "react";
import { styled } from "@akabase/styled-system/jsx";
import { textarea } from "@akabase/styled-system/recipes";

export type TextareaProps = ComponentProps<typeof Textarea>;
export const Textarea = styled(Field.Textarea, textarea);
