import { ButtonGroup, IconButton, ScrollArea } from "@/components/ui";
import { Box, Flex, Grid } from "styled-system/jsx";
import { UndoRedoButton } from "./undo-redo-button";
import { HeadingSelect } from "./heading-select";
import { MarkButton } from "./mark-button";
import { ListButton } from "./list-button";
import { TextAlignButton } from "./text-align-button";
import { ToolbarSeparator } from "./toolbar-separator";
import { Maximize2Icon, Minimize2Icon } from "lucide-react";

type Props = {
  maximized?: boolean;
  toggleMaximize?: () => void;
  className?: string;
};

export function Toolbar({ className, maximized, toggleMaximize }: Props) {
  return (
    <Grid className={className} gridTemplateColumns="1fr auto">
      <ScrollArea.Root gap="2" overflowX="auto" size="xs">
        <ScrollArea.Viewport>
          <ScrollArea.Content>
            <Flex
              data-maximized={maximized}
              gap="2"
              css={{ "&[data-maximized=true]": { justifyContent: "center" } }}
            >
              <ToolbarGroup>
                <UndoRedoButton action="undo" />
                <UndoRedoButton action="redo" />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <HeadingSelect />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <MarkButton type="bold" />
                <MarkButton type="italic" />
                <MarkButton type="strike" />
                <MarkButton type="underline" />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <ListButton type="bulletList" />
                <ListButton type="orderedList" />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <TextAlignButton align="left" />
                <TextAlignButton align="center" />
                <TextAlignButton align="right" />
                <TextAlignButton align="justify" />
              </ToolbarGroup>
            </Flex>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="horizontal" />
        <ScrollArea.Corner />
      </ScrollArea.Root>
      <Box>
        {toggleMaximize && (
          <IconButton size="xs" variant="plain" colorPalette="gray" onClick={toggleMaximize}>
            {maximized ? <Minimize2Icon /> : <Maximize2Icon />}
          </IconButton>
        )}
      </Box>
    </Grid>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <ButtonGroup variant="plain" size="xs" gap="1" colorPalette="gray">
      {children}
    </ButtonGroup>
  );
}
