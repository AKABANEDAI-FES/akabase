import { useForm, useStore } from "@tanstack/react-form";
import { useBlocker } from "@tanstack/react-router";
import { Result } from "@akabase/result";
import { useMutation } from "@tanstack/react-query";
import { useUpsertEventSettingsMutationOption } from "../actions/mutations/event-settings";
import type { EventSettingsDetail } from "@akabase/application/query/event/get-event-settings";
import { Button } from "@akabase/ui/components/button";
import { Field } from "@akabase/ui/components/field";
import { Heading } from "@akabase/ui/components/heading";
import { Textarea } from "@akabase/ui/components/textarea";
import { toaster } from "@akabase/ui/components/toast";
import { Text } from "@akabase/ui/components/text";
import { Box, Flex, Stack } from "@akabase/styled-system/jsx";
import { confirm } from "@/components/confirm";

type EventSettingsFormProps = {
  settings: EventSettingsDetail;
  disabled: boolean;
};

/**
 * Event settings edit form
 * Categories are h2 sections, not fieldsets (position: sticky breaks inside fieldset in Chromium)
 */
export function EventSettingsForm({ settings, disabled }: EventSettingsFormProps) {
  const { mutateAsync } = useMutation(useUpsertEventSettingsMutationOption());

  const form = useForm({
    defaultValues: {
      webContentDescription: settings.webContentDescription ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await mutateAsync({
          data: {
            eventId: settings.eventId,
            webContentDescription: value.webContentDescription,
          },
        });

        if (Result.isFailure(result)) {
          toaster.create({
            type: "error",
            title: "エラー",
            description: result.error.message,
          });
          return;
        }

        form.reset(value);
        toaster.create({
          type: "success",
          title: "イベント詳細設定を保存しました",
        });
      } catch (error) {
        console.error("Failed to upsert event settings:", error);
        toaster.create({
          type: "error",
          title: "エラー",
          description: "予期しないエラーが発生しました",
        });
      }
    },
  });

  const isDefaultValue = useStore(form.store, (state) => state.isDefaultValue);

  useBlocker({
    shouldBlockFn: async () => {
      if (isDefaultValue) {
        return false;
      }

      const result = await confirm({
        title: "変更が保存されていません。",
        description: "このページから移動すると、保存されていない変更は失われます。よろしいですか？",
        cancelText: "このページに留まる",
        confirmText: "移動する",
      });

      return !result;
    },
    enableBeforeUnload: !isDefaultValue,
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit();
      }}
    >
      <Stack gap="10">
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          gap={{ base: "5", md: "8" }}
        >
          <Box maxW="xs" w="full">
            <Box position="sticky" top="4" py="2">
              <Heading as="h2" textStyle="lg" fontWeight="semibold">
                企画設定
              </Heading>
              <Text color="fg.muted" textStyle="sm">
                企画の入力フォームに関する設定
              </Text>
            </Box>
          </Box>
          <Stack gap="6" w="full" maxW="2xl">
            <form.Field name="webContentDescription">
              {(field) => (
                <Field.Root>
                  <Field.Label htmlFor={field.name}>Web用コンテンツの入力案内</Field.Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={
                      "例: 以下の順に記載してください\n1. 紹介文 (Webサイト用)\n2. 注意事項\n3. 企画ページに掲載する写真 (任意・5枚まで)\n4. SNSリンク (X, Instagram, YouTube, HP)\n5. 販売メニューと価格 (任意)"
                    }
                    rows={6}
                    disabled={disabled}
                  />
                  <Field.HelperText>
                    出展団体がWeb用コンテンツを入力する際に、入力欄の案内として表示されます。空の場合は表示されません。
                  </Field.HelperText>
                </Field.Root>
              )}
            </form.Field>
          </Stack>
        </Flex>

        <Box>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting, state.isDefaultValue]}
          >
            {([canSubmit, isSubmitting, isDefault]) => (
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!canSubmit || isDefault || disabled}
              >
                保存
              </Button>
            )}
          </form.Subscribe>
        </Box>
      </Stack>
    </form>
  );
}
