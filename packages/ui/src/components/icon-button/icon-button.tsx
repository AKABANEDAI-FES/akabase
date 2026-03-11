import { forwardRef } from "react";
import { Button } from "../button/button";
import type { ButtonProps } from "../button/button";

export type IconButtonProps = {} & ButtonProps;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(props, ref) {
    return <Button px="0" py="0" ref={ref} {...props} />;
  },
);
