"use client";
import { ark } from "@ark-ui/react/factory";
import { createContext, mergeProps } from "@ark-ui/react/utils";
import { forwardRef, useMemo } from "react";
import type { ComponentProps } from "react";
import { styled } from "@akabase/styled-system/jsx";
import { button } from "@akabase/styled-system/recipes";
import type { ButtonVariantProps } from "@akabase/styled-system/recipes";
import { Group } from "../group/group";
import type { GroupProps } from "../group/group";
import { Loader } from "../loader/loader";

type ButtonLoadingProps = {
  /**
   * If `true`, the button will show a loading spinner.
   * @default false
   */
  loading?: boolean | undefined;
  /**
   * The text to show while loading.
   */
  loadingText?: React.ReactNode | undefined;
  /**
   * The spinner to show while loading.
   */
  spinner?: React.ReactNode | undefined;
  /**
   * The placement of the spinner
   * @default "start"
   */
  spinnerPlacement?: "start" | "end" | undefined;
};

type BaseButtonProps = ComponentProps<typeof BaseButton>;
const BaseButton = styled(ark.button, button);

export type ButtonProps = {} & BaseButtonProps & ButtonLoadingProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const propsContext = useButtonPropsContext();
  const buttonProps = useMemo(
    () => mergeProps<ButtonProps>(propsContext, props),
    [propsContext, props],
  );

  const { loading, loadingText, children, spinner, spinnerPlacement, ...rest } = buttonProps;
  return (
    <BaseButton
      type="button"
      ref={ref}
      {...rest}
      data-loading={loading ? "" : undefined}
      disabled={loading || rest.disabled}
    >
      {!props.asChild && loading ? (
        <Loader spinner={spinner} text={loadingText} spinnerPlacement={spinnerPlacement}>
          {children}
        </Loader>
      ) : (
        children
      )}
    </BaseButton>
  );
});

export type ButtonGroupProps = {} & GroupProps & ButtonVariantProps;

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup(props, ref) {
    const [variantProps, otherProps] = useMemo(() => button.splitVariantProps(props), [props]);
    return (
      <ButtonPropsProvider value={variantProps}>
        <Group ref={ref} {...otherProps} />
      </ButtonPropsProvider>
    );
  },
);

const [ButtonPropsProvider, useButtonPropsContext] = createContext<ButtonVariantProps>({
  name: "ButtonPropsContext",
  hookName: "useButtonPropsContext",
  providerName: "<PropsProvider />",
  strict: false,
});
