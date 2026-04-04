"use client";
import type { Assign, SelectRootProps } from "@ark-ui/react";
import { ark } from "@ark-ui/react/factory";
import { Select, useSelectContext, useSelectItemContext } from "@ark-ui/react/select";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import { forwardRef } from "react";
import type { RefAttributes } from "react";
import { createStyleContext } from "@akabase/styled-system/jsx";
import { select } from "@akabase/styled-system/recipes";
import type { SelectVariantProps } from "@akabase/styled-system/recipes";
import type { HTMLStyledProps } from "@akabase/styled-system/types";

const { withProvider, withContext } = createStyleContext(select);

type StyleProps = SelectVariantProps & HTMLStyledProps<"div">;

export type RootProps<T> = Assign<SelectRootProps<T>, StyleProps> & RefAttributes<HTMLDivElement>;

export const Root = withProvider(Select.Root, "root") as Select.RootComponent<StyleProps>;

// export const ClearTrigger = withContext(Select.ClearTrigger, "clearTrigger");
export const Content = withContext(Select.Content, "content");
export const Control = withContext(Select.Control, "control");
export const IndicatorGroup = withContext(ark.div, "indicatorGroup");
export const Item = withContext(Select.Item, "item");
export const ItemGroup = withContext(Select.ItemGroup, "itemGroup");
export const ItemGroupLabel = withContext(Select.ItemGroupLabel, "itemGroupLabel");
export const ItemText = withContext(Select.ItemText, "itemText");
export const Label = withContext(Select.Label, "label");
export const List = withContext(Select.List, "list");
export const Positioner = withContext(Select.Positioner, "positioner");
export const Trigger = withContext(Select.Trigger, "trigger");
export const ValueText = withContext(Select.ValueText, "valueText");
export const Indicator = withContext(Select.Indicator, "indicator", {
  defaultProps: { children: <ChevronsUpDownIcon /> },
});
export const { HiddenSelect } = Select;

export {
  SelectContext as Context,
  SelectItemContext as ItemContext,
  type SelectValueChangeDetails as ValueChangeDetails,
} from "@ark-ui/react/select";

const StyledItemIndicator = withContext(Select.ItemIndicator, "itemIndicator");

export const ItemIndicator = forwardRef<HTMLDivElement, HTMLStyledProps<"div">>(
  function ItemIndicator(props, ref) {
    const item = useSelectItemContext();

    return item.selected ? (
      <StyledItemIndicator ref={ref} {...props}>
        <CheckIcon />
      </StyledItemIndicator>
    ) : (
      <svg aria-hidden="true" focusable="false" />
    );
  },
);

const StyledClearTrigger = withContext(Select.ClearTrigger, "clearTrigger");

export const ClearTrigger = forwardRef<HTMLButtonElement, HTMLStyledProps<"button">>(
  function ClearTrigger(props, ref) {
    const { value } = useSelectContext();

    return value.length > 0 ? (
      <StyledClearTrigger ref={ref} {...props}>
        <XIcon />
      </StyledClearTrigger>
    ) : null;
  },
);
