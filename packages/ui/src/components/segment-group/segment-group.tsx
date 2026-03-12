"use client";
import { SegmentGroup } from "@ark-ui/react/segment-group";
import { useMemo } from "react";
import type { ComponentProps, ReactNode } from "react";
import { createStyleContext } from "@archive/styled-system/jsx";
import { segmentGroup } from "@archive/styled-system/recipes";

const { withProvider, withContext } = createStyleContext(segmentGroup);

export type RootProps = ComponentProps<typeof Root>;

export const Root = withProvider(SegmentGroup.Root, "root", {
  defaultProps: { orientation: "horizontal" },
  forwardProps: ["orientation"],
});
export const RootProvider = withProvider(SegmentGroup.RootProvider, "root");
export const Indicator = withContext(SegmentGroup.Indicator, "indicator");
export const Item = withContext(SegmentGroup.Item, "item");
export const ItemControl = withContext(SegmentGroup.ItemControl, "itemControl");
export const { ItemHiddenInput } = SegmentGroup;
export const ItemText = withContext(SegmentGroup.ItemText, "itemText");
export const Label = withContext(SegmentGroup.Label, "label");

export { SegmentGroupContext as Context } from "@ark-ui/react/segment-group";

type Item = {
  value: string;
  label: ReactNode;
  disabled?: boolean | undefined;
};

type ItemProps = ComponentProps<typeof Item>;

export type ItemsProps = {
  items: (string | Item)[];
} & Omit<ItemProps, "value">;

export const Items = (props: ItemsProps) => {
  const { items, ...itemProps } = props;
  const data = useMemo(() => normalize(items), [items]);

  return data.map((item) => (
    <Item key={item.value} value={item.value} disabled={item.disabled} {...itemProps}>
      <ItemText>{item.label}</ItemText>
      <ItemHiddenInput />
    </Item>
  ));
};

const normalize = (items: (string | Item)[]): Item[] =>
  items.map((item) => (typeof item === "string" ? { value: item, label: item } : item));
