"use client";
import { ark } from "@ark-ui/react/factory";
import { forwardRef } from "react";
import { css } from "@archive/styled-system/css";
import { createStyleContext } from "@archive/styled-system/jsx";
import { table } from "@archive/styled-system/recipes";
import type { TableRecipe } from "@archive/styled-system/recipes";
import type {
  AsProps,
  Assign,
  ComponentProps,
  JsxHTMLProps,
  JsxStyleProps,
  RecipeVariantProps,
  UnstyledProps,
} from "@archive/styled-system/types";
import type { PolymorphicProps } from "@ark-ui/react";

const { withProvider, withContext } = createStyleContext(table);

const InnerRoot = withProvider(ark.table, "root");

// StyleContextProvider<"table", typeof table> と同じ構造
export type RootProps = JsxHTMLProps<
  ComponentProps<"table"> & UnstyledProps & AsProps,
  Assign<RecipeVariantProps<TableRecipe>, JsxStyleProps>
> &
  PolymorphicProps;
export const Root = forwardRef<HTMLTableElement, RootProps>((props, ref) => (
  <div className={css({ overflowX: "auto", width: "full" })}>
    <InnerRoot ref={ref} {...props} />
  </div>
));
Root.displayName = "Table.Root";
export const Body = withContext(ark.tbody, "body");
export const Caption = withContext(ark.caption, "caption");
export const Cell = withContext(ark.td, "cell");
export const Foot = withContext(ark.tfoot, "foot");
export const Head = withContext(ark.thead, "head");
export const Header = withContext(ark.th, "header");
export const Row = withContext(ark.tr, "row");
