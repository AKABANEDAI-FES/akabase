import { useCallback, useEffect, useEffectEvent, useState, useTransition } from "react";
import {
  Button,
  CloseButton,
  Dialog,
  Field,
  Icon,
  IconButton,
  NumberInput,
  Select,
  SkeletonText,
  Slider,
  Spinner,
  Text,
  toaster,
} from "@/components/ui";
import { Portal } from "@ark-ui/react/portal";
import { useDialogContext } from "@ark-ui/react/dialog";
import { createListCollection } from "@ark-ui/react/collection";
import type { ImageObject, ProcessImageOptions } from "@/libs/image";
import { createImageObject, processImage } from "@/libs/image";
import { css } from "styled-system/css";
import { Box, Flex, Grid, Stack } from "styled-system/jsx";
import { ArrowRightIcon, Link2Icon, Unlink2Icon } from "lucide-react";
import { Format } from "@ark-ui/react";

const formatCollection = createListCollection({
  items: [
    { value: "jpeg", label: "JPEG" },
    { value: "png", label: "PNG" },
    { value: "webp", label: "WebP" },
  ],
});

type Props = {
  imageUrl: string;
  onProcessed: (file: File) => void;
  children: React.ReactNode;
};

export function ProcessImageDialog({ imageUrl, onProcessed, children }: Props) {
  return (
    <Dialog.Root size="2xl">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <ProcessImageDialogContent imageUrl={imageUrl} onProcessed={onProcessed} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

type OutputFormat = NonNullable<ProcessImageOptions["compress"]>["format"];

type PatchOptions = {
  [K in keyof ProcessImageOptions]?: Partial<NonNullable<ProcessImageOptions[K]>>;
};

function ProcessImageDialogContent({
  imageUrl,
  onProcessed,
}: {
  imageUrl: string;
  onProcessed: (file: File) => void;
}) {
  const dialog = useDialogContext();
  const [originalImage, setOriginalImage] = useState<ImageObject | null>(null);
  const [processedImage, setProcessedImage] = useState<ImageObject | null>(null);
  const [resizeOption, setResizeOption] = useState<ProcessImageOptions["resize"]>();
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [compressOption, setCompressOption] = useState<ProcessImageOptions["compress"]>();
  const [isPending, startTransition] = useTransition();

  const closeDialog = useEffectEvent(() => {
    dialog.setOpen(false);
  });

  const handleOptionChange = useCallback((image: ImageObject, options: ProcessImageOptions) => {
    startTransition(async () => {
      const { resize, compress } = options;
      try {
        const needsResize =
          resize && (resize.width !== image.meta.width || resize.height !== image.meta.height);

        const processed = await processImage(image, {
          resize: needsResize ? resize : undefined,
          compress: compress,
        });

        setProcessedImage(processed);
      } catch {
        toaster.create({
          type: "error",
          title: "処理エラー",
          description: "画像の処理に失敗しました",
        });
      }
    });
  }, []);

  const patchOption = useCallback(
    (options: PatchOptions) => {
      if (!originalImage) return;

      if (options.resize) {
        const { resize } = options;
        setResizeOption((prev) => ({
          width: resize.width ?? prev?.width ?? originalImage.meta.width,
          height: resize.height ?? prev?.height ?? originalImage.meta.height,
        }));
      }

      if (options.compress) {
        const { compress } = options;
        setCompressOption((prev) => ({
          quality: compress.quality ?? prev?.quality ?? 0.8,
          format: compress.format ?? prev?.format ?? "webp",
        }));
      }
    },
    [originalImage],
  );

  useEffect(() => {
    if (!originalImage) return;
    handleOptionChange(originalImage, { resize: resizeOption, compress: compressOption });
  }, [resizeOption, compressOption, originalImage, handleOptionChange]);

  useEffect(() => {
    createImageObject(imageUrl)
      .then((imageObject) => {
        setOriginalImage(imageObject);
        setResizeOption({ width: imageObject.meta.width, height: imageObject.meta.height });
        setCompressOption({ quality: 0.8, format: "webp" });
      })
      .catch(() => {
        toaster.create({
          type: "error",
          title: "画像の読み込みエラー",
          description: "画像の読み込みに失敗しました。再度お試しください。",
        });
        closeDialog();
      });
  }, [imageUrl]);

  const handleWidthChange = (details: { valueAsNumber: number }) => {
    if (!originalImage) return;
    const aspectRatio = originalImage.meta.width / originalImage.meta.height;
    const newWidth = details.valueAsNumber;
    if (Number.isNaN(newWidth) || newWidth < 1) return;
    if (keepAspectRatio) {
      const newHeight = Math.round(newWidth / aspectRatio);
      patchOption({ resize: { width: newWidth, height: newHeight } });
    } else {
      patchOption({ resize: { width: newWidth } });
    }
  };

  const handleHeightChange = (details: { valueAsNumber: number }) => {
    if (!originalImage) return;
    const aspectRatio = originalImage.meta.width / originalImage.meta.height;
    const newHeight = details.valueAsNumber;
    if (Number.isNaN(newHeight) || newHeight < 1) return;
    if (keepAspectRatio) {
      const newWidth = Math.round(newHeight * aspectRatio);
      patchOption({ resize: { width: newWidth, height: newHeight } });
    } else {
      patchOption({ resize: { height: newHeight } });
    }
  };

  const handleSave = () => {
    if (!processedImage) return;
    try {
      const processedFile = new File([processedImage?.blob], `image.${compressOption?.format}`, {
        type: `image/${compressOption?.format}`,
      });
      onProcessed(processedFile);
      dialog.setOpen(false);
    } catch {
      toaster.create({
        type: "error",
        title: "処理エラー",
        description: "画像の処理に失敗しました",
      });
    }
  };

  const isLoaded = !!originalImage;

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>画像を編集</Dialog.Title>
        <Dialog.Description>リサイズや圧縮の設定ができます</Dialog.Description>
      </Dialog.Header>
      <Dialog.Body>
        <Grid columns={{ base: 1, md: 2 }} gap="5" w="full">
          <Box display="grid" placeItems="center" bg="gray.2" rounded="l2">
            {isLoaded ? (
              <img
                src={imageUrl}
                alt="プレビュー"
                className={css({
                  maxW: "full",
                  objectFit: "contain",
                })}
              />
            ) : (
              <Spinner size="lg" />
            )}
          </Box>

          {isLoaded && (
            <Stack gap="6">
              <Stack>
                <Text fontWeight="medium" textStyle="sm">
                  リサイズ
                </Text>
                <Flex gap="2" alignItems="flex-end">
                  <Field.Root flex="1">
                    <Field.Label>幅（px）</Field.Label>
                    <NumberInput.Root
                      min={1}
                      value={resizeOption?.width.toString() ?? ""}
                      onValueChange={handleWidthChange}
                      size="sm"
                    >
                      <NumberInput.Control />
                      <NumberInput.Input />
                    </NumberInput.Root>
                  </Field.Root>
                  <IconButton
                    variant="outline"
                    size="sm"
                    onClick={() => setKeepAspectRatio((v) => !v)}
                    aria-label={keepAspectRatio ? "縦横比を解除" : "縦横比を固定"}
                  >
                    {keepAspectRatio ? <Link2Icon /> : <Unlink2Icon />}
                  </IconButton>
                  <Field.Root flex="1">
                    <Field.Label>高さ（px）</Field.Label>
                    <NumberInput.Root
                      min={1}
                      value={resizeOption?.height.toString() ?? ""}
                      onValueChange={handleHeightChange}
                      size="sm"
                    >
                      <NumberInput.Control />
                      <NumberInput.Input />
                    </NumberInput.Root>
                  </Field.Root>
                </Flex>
                <Text textStyle="xs" color="fg.muted">
                  元のサイズ: {originalImage?.meta.width} × {originalImage?.meta.height}px
                </Text>
              </Stack>

              <Stack>
                <Text fontWeight="medium" textStyle="sm">
                  圧縮
                </Text>
                <Select.Root
                  collection={formatCollection}
                  value={[compressOption?.format || "webp"]}
                  // onValueChange={({ value }) => setFormat(value[0] as OutputFormat)}
                  onValueChange={({ value }) =>
                    setCompressOption((prev) =>
                      prev
                        ? { ...prev, format: value[0] as OutputFormat }
                        : { quality: 0.8, format: value[0] as OutputFormat },
                    )
                  }
                  positioning={{ sameWidth: true }}
                  size="sm"
                >
                  <Select.Label>出力形式</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText />
                      <Select.Indicator />
                    </Select.Trigger>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {formatCollection.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          <Select.ItemText>{item.label}</Select.ItemText>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
                <Slider.Root
                  min={1}
                  max={100}
                  value={[
                    compressOption?.quality !== undefined ? compressOption.quality * 100 : 80,
                  ]}
                  onValueChange={({ value }) =>
                    setCompressOption((prev) =>
                      prev
                        ? { ...prev, quality: value[0] / 100 }
                        : { quality: value[0] / 100, format: "webp" },
                    )
                  }
                >
                  {compressOption?.format !== "png" ? (
                    <>
                      <Slider.Label>
                        品質: {Math.round((compressOption?.quality || 0.8) * 100)}%
                      </Slider.Label>
                      <Slider.Control>
                        <Slider.Track>
                          <Slider.Range />
                        </Slider.Track>
                        <Slider.Thumbs />
                      </Slider.Control>
                    </>
                  ) : (
                    <>
                      <Slider.Label>品質</Slider.Label>
                      <Text textStyle="sm" color="fg.muted">
                        PNG形式では品質設定は適用されません
                      </Text>
                    </>
                  )}
                </Slider.Root>
              </Stack>
            </Stack>
          )}
        </Grid>
      </Dialog.Body>
      <Dialog.Footer>
        <Flex textStyle="xs" color="fg.muted" alignItems="center" gap="1">
          {originalImage?.blob ? (
            <Format.Byte value={originalImage.blob.size} />
          ) : (
            <SkeletonText noOfLines={1} w="8" />
          )}
          <Icon size="2xs">
            <ArrowRightIcon />
          </Icon>
          {processedImage?.blob ? (
            <Format.Byte value={processedImage.blob.size} />
          ) : (
            <SkeletonText w="8" noOfLines={1} />
          )}
        </Flex>
        <Dialog.ActionTrigger asChild>
          <Button variant="outline">キャンセル</Button>
        </Dialog.ActionTrigger>
        <Button onClick={handleSave} loading={isPending} disabled={isPending || !isLoaded}>
          適用
        </Button>
      </Dialog.Footer>
      <Dialog.CloseTrigger asChild>
        <CloseButton />
      </Dialog.CloseTrigger>
    </Dialog.Content>
  );
}
