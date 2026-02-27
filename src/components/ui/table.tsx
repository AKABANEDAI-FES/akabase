"use client";
import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { forwardRef } from "react";
import { css } from "styled-system/css";
import { createStyleContext } from "styled-system/jsx";
import { table } from "styled-system/recipes";

const { withProvider, withContext } = createStyleContext(table);

const InnerRoot = withProvider(ark.table, "root");

export type RootProps = ComponentProps<typeof InnerRoot>;
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
