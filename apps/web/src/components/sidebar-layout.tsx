import { createContext, use, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { Portal } from "@ark-ui/react/portal";
import { css } from "@archive/styled-system/css";
import { Stack } from "@archive/styled-system/jsx";
import { MenuIcon } from "lucide-react";
import { Button } from "@archive/ui/components/button";
import { CloseButton } from "@archive/ui/components/close-button";
import { Drawer } from "@archive/ui/components/drawer";
import { Heading } from "@archive/ui/components/heading";
import { IconButton } from "@archive/ui/components/icon-button";
import { Text } from "@archive/ui/components/text";

const SidebarNavContext = createContext<{ onNavigate?: () => void }>({});

type SidebarLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export function SidebarLayout({ title, children }: SidebarLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={css({ display: "flex", flexDirection: "column", minHeight: "100svh" })}>
      <Drawer.Root
        open={drawerOpen}
        onOpenChange={({ open }) => setDrawerOpen(open)}
        placement="start"
      >
        <header
          className={css({
            display: { base: "flex", lg: "none" },
            alignItems: "center",
            gap: "3",
            padding: "3",
            backgroundColor: "bg.default",
            shadow: "sm",
            position: "sticky",
            top: "0",
            zIndex: "sticky",
          })}
        >
          <Drawer.Trigger asChild>
            <IconButton variant="plain" colorPalette="gray" size="md" aria-label="メニューを開く">
              <MenuIcon />
            </IconButton>
          </Drawer.Trigger>
          <Heading as="h1" textStyle="lg">
            {title}
          </Heading>
        </header>

        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.CloseTrigger asChild>
                <CloseButton />
              </Drawer.CloseTrigger>
              <Drawer.Header>
                <Drawer.Title>{title}</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body gap="8" css={{ "& > *": { w: "full" } }}>
                <SidebarNavContext value={{ onNavigate: () => setDrawerOpen(false) }}>
                  {children}
                </SidebarNavContext>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", lg: "auto 1fr" },
          flex: "1",
        })}
      >
        <nav
          className={css({
            display: { base: "none", lg: "block" },
            width: "xs",
            backgroundColor: "bg.default",
            shadow: "sm",
            padding: "4",
            h: "100svh",
            position: "sticky",
            top: "0",
          })}
        >
          <Stack gap="8">
            <Heading as="h1" textStyle="lg">
              {title}
            </Heading>
            {children}
          </Stack>
        </nav>

        <main className={css({ minWidth: 0 })}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

type NavLinkProps = {
  children: React.ReactNode;
};

export function NavLink({ children }: NavLinkProps) {
  const { onNavigate } = use(SidebarNavContext);
  return (
    <Button
      variant="plain"
      size="md"
      colorPalette="gray"
      justifyContent="flex-start"
      css={{
        _currentPage: {
          backgroundColor: "colorPalette.plain.bg.hover",
          color: "colorPalette.surface.fg",
          _hover: {
            backgroundColor: "colorPalette.plain.bg.active",
          },
        },
      }}
      asChild
      onClick={onNavigate}
    >
      {children}
    </Button>
  );
}

type NavSectionProps = {
  label: string;
  children: React.ReactNode;
};

export function NavSection({ label, children }: NavSectionProps) {
  return (
    <Stack gap="2">
      <Text textStyle="xs" fontWeight="semibold" color="fg.muted" pl="3.5">
        {label}
      </Text>
      <Stack gap="1">{children}</Stack>
    </Stack>
  );
}
