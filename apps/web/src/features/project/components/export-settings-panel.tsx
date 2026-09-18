import type { ReactNode } from "react";
import { Stack } from "@akabase/styled-system/jsx";
import { Card } from "@akabase/ui/components/card";
import { Checkbox } from "@akabase/ui/components/checkbox";
import { Text } from "@akabase/ui/components/text";

type ExportSettingsPanelProps = {
  columns: { id: string; header: string }[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  summary: string;
  children: ReactNode;
};

export function ExportSettingsPanel({
  columns,
  selectedIds,
  onSelectedIdsChange,
  summary,
  children,
}: ExportSettingsPanelProps) {
  return (
    <Card.Root size="sm">
      <Card.Header>
        <Card.Title>エクスポート設定</Card.Title>
      </Card.Header>
      <Card.Body>
        <Stack gap="6">
          <Checkbox.Group value={selectedIds} onValueChange={onSelectedIdsChange}>
            <Stack gap="1.5">
              {columns.map((col) => (
                <Checkbox.Root key={col.id} value={col.id} size="sm">
                  <Checkbox.HiddenInput />
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Label>{col.header}</Checkbox.Label>
                </Checkbox.Root>
              ))}
            </Stack>
          </Checkbox.Group>

          <Stack gap="2">
            <Text textStyle="sm" color="fg.muted">
              {summary}
            </Text>
            <Stack gap="2">{children}</Stack>
          </Stack>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
