import { ButtonGroup } from "@akabase/ui/components/button";
import { IconButton } from "@akabase/ui/components/icon-button";
import { ScrollArea } from "@akabase/ui/components/scroll-area";
import { Box, Flex, Grid } from "@akabase/styled-system/jsx";
import { UndoRedoButton } from "./undo-redo-button";
import { HeadingSelect } from "./heading-select";
import { MarkButton } from "./mark-button";
import { ListButton } from "./list-button";
import { TextAlignButton } from "./text-align-button";
import { ImageUploadButton } from "./image-upload-button";
import { LinkButton } from "./link-button";
import { ToolbarSeparator } from "./toolbar-separator";
import type { ImageScope } from "@akabase/domain/shared/image";
import { Maximize2Icon, Minimize2Icon } from "lucide-react";

type Props = {
  maximized?: boolean;
  toggleMaximize?: () => void;
  className?: string;
  imageScope: ImageScope;
};

export function Toolbar({ className, maximized, toggleMaximize, imageScope }: Props) {
  return (
    <Grid className={className} gap="0" gridTemplateColumns="minmax(0, 1fr) auto 1fr">
      <ScrollArea.Root overflowX="auto" size="xs" gridColumnStart="2">
        <ScrollArea.Viewport>
          <ScrollArea.Content>
            <Flex gap="2">
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
                <ImageUploadButton scope={imageScope} />
                <LinkButton />
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
      <Box gridColumnStart="3" justifySelf="end" pl="2">
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
