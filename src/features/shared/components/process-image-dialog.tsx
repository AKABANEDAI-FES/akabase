import { useCallback, useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
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
import { MAX_FILE_SIZE } from "@/domain/shared/storage";
import { css } from "styled-system/css";
import { Box, Flex, Grid, Stack } from "styled-system/jsx";
import { ArrowRightIcon, GripVerticalIcon, Link2Icon, Unlink2Icon } from "lucide-react";
import { Format } from "@ark-ui/react";

const formatCollection = createListCollection({
  items: [
    { value: "jpeg", label: "JPEG" },
    { value: "png", label: "PNG" },
    { value: "webp", label: "WebP" },
  ],
});

type OutputFormat = NonNullable<ProcessImageOptions["compress"]>["format"];

type ResizeOption = NonNullable<ProcessImageOptions["resize"]>;
type CompressOption = NonNullable<ProcessImageOptions["compress"]>;

export type ProcessedImageResult = {
  file: File;
  width: number;
  height: number;
};

type Props = {
  imageUrl: string;
  onProcessed: (result: ProcessedImageResult) => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (details: { open: boolean }) => void;
};

export function ProcessImageDialog({ imageUrl, onProcessed, children, open, onOpenChange }: Props) {
  return (
    <Dialog.Root size="2xl" open={open} onOpenChange={onOpenChange}>
      {children && <Dialog.Trigger asChild>{children}</Dialog.Trigger>}
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <ProcessImageDialogContent imageUrl={imageUrl} onProcessed={onProcessed} />
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function useImageProcessor(imageUrl: string, onClose: () => void) {
  const [originalImage, setOriginalImage] = useState<ImageObject | null>(null);
  const [processedImage, setProcessedImage] = useState<ImageObject | null>(null);
  const [resizeOption, setResizeOption] = useState<ResizeOption | undefined>();
  const [compressOption, setCompressOption] = useState<CompressOption | undefined>();
  const [isPending, startTransition] = useTransition();

  const closeDialog = useEffectEvent(() => onClose());

  const processCurrentImage = useCallback((image: ImageObject, options: ProcessImageOptions) => {
    startTransition(async () => {
      try {
        const { resize, compress } = options;
        const needsResize =
          resize && (resize.width !== image.meta.width || resize.height !== image.meta.height);

        const processed = await processImage(image, {
          resize: needsResize ? resize : undefined,
          compress,
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

  useEffect(() => {
    if (!originalImage) return;
    processCurrentImage(originalImage, { resize: resizeOption, compress: compressOption });
  }, [resizeOption, compressOption, originalImage, processCurrentImage]);

  const updateResize = useCallback(
    (patch: Partial<ResizeOption>) => {
      if (!originalImage) return;
      setResizeOption((prev) => ({
        width: patch.width ?? prev?.width ?? originalImage.meta.width,
        height: patch.height ?? prev?.height ?? originalImage.meta.height,
      }));
    },
    [originalImage],
  );

  const updateCompress = useCallback((patch: Partial<CompressOption>) => {
    setCompressOption((prev) => ({
      quality: patch.quality ?? prev?.quality ?? 0.8,
      format: patch.format ?? prev?.format ?? "webp",
    }));
  }, []);

  return {
    originalImage,
    processedImage,
    resizeOption,
    compressOption,
    isPending,
    updateResize,
    updateCompress,
  };
}

function useCompareSlider() {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const updatePosition = (clientX: number) => {
      const rect = container.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      setPosition(Math.max(0, Math.min(100, x)));
    };

    updatePosition(e.clientX);

    const handleMove = (e: PointerEvent) => updatePosition(e.clientX);
    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  }, []);

  return { position, containerRef, handlePointerDown };
}

function useObjectUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return url;
}

function ImageCompareViewer({
  originalUrl,
  processedUrl,
}: {
  originalUrl: string;
  processedUrl: string | null;
}) {
  const { position, containerRef, handlePointerDown } = useCompareSlider();
  const isComparing = !!processedUrl;

  return (
    <Box
      ref={containerRef}
      position="relative"
      bg="gray.2"
      rounded="l2"
      overflow="hidden"
      cursor={isComparing ? "col-resize" : "default"}
      onPointerDown={isComparing ? handlePointerDown : undefined}
      className={css({ userSelect: "none", touchAction: "none" })}
    >
      {/* コンテナの高さ確保用: 画像と同サイズの透明領域 */}
      <img
        src={originalUrl}
        aria-hidden
        draggable={false}
        className={css({ w: "full", display: "block", objectFit: "contain", visibility: "hidden" })}
      />
      <img
        src={originalUrl}
        alt="オリジナル"
        draggable={false}
        className={css({
          position: "absolute",
          top: 0,
          left: 0,
          w: "full",
          h: "full",
          objectFit: "contain",
        })}
        style={isComparing ? { clipPath: `inset(0 ${100 - position}% 0 0)` } : undefined}
      />
      {isComparing && (
        <>
          <img
            src={processedUrl}
            alt="編集後"
            draggable={false}
            className={css({
              position: "absolute",
              top: 0,
              left: 0,
              w: "full",
              h: "full",
              objectFit: "contain",
            })}
            style={{ clipPath: `inset(0 0 0 ${position}%)` }}
          />
          <div
            className={css({
              position: "absolute",
              top: 0,
              bottom: 0,
              w: "0.5",
              bg: "bg.default",
              pointerEvents: "none",
            })}
            style={{ left: `${position}%`, transform: "translateX(-50%)" }}
          />
          <div
            className={css({
              position: "absolute",
              top: "50%",
              transform: "translate(-50%, -50%)",
              boxSize: "7",
              rounded: "full",
              bg: "bg.default",
              shadow: "md",
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
              color: "fg.muted",
            })}
            style={{ left: `${position}%` }}
          >
            <Icon size="sm">
              <GripVerticalIcon />
            </Icon>
          </div>
          <ImageLabel side="left">元画像</ImageLabel>
          <ImageLabel side="right">編集後</ImageLabel>
        </>
      )}
    </Box>
  );
}

function ImageLabel({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <span
      className={css({
        position: "absolute",
        top: "1.5",
        textStyle: "xs",
        bg: "gray.a11",
        color: "colorPalette.solid.fg",
        px: "1.5",
        py: "0.5",
        rounded: "sm",
        "&[ data-side='left']": { left: "1.5" },
        "&[ data-side='right']": { right: "1.5" },
      })}
      data-side={side}
    >
      {children}
    </span>
  );
}

function ResizeSection({
  originalImage,
  resizeOption,
  onResizeChange,
}: {
  originalImage: ImageObject;
  resizeOption: ResizeOption | undefined;
  onResizeChange: (patch: Partial<ResizeOption>) => void;
}) {
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const aspectRatio = originalImage.meta.width / originalImage.meta.height;

  const handleWidthChange = ({ valueAsNumber: newWidth }: { valueAsNumber: number }) => {
    if (Number.isNaN(newWidth) || newWidth < 1) return;
    onResizeChange(
      keepAspectRatio
        ? { width: newWidth, height: Math.round(newWidth / aspectRatio) }
        : { width: newWidth },
    );
  };

  const handleHeightChange = ({ valueAsNumber: newHeight }: { valueAsNumber: number }) => {
    if (Number.isNaN(newHeight) || newHeight < 1) return;
    onResizeChange(
      keepAspectRatio
        ? { height: newHeight, width: Math.round(newHeight * aspectRatio) }
        : { height: newHeight },
    );
  };

  return (
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
        元のサイズ: {originalImage.meta.width} × {originalImage.meta.height}px
      </Text>
    </Stack>
  );
}

function CompressSection({
  compressOption,
  onFormatChange,
  onQualityChange,
}: {
  compressOption: CompressOption | undefined;
  onFormatChange: (format: OutputFormat) => void;
  onQualityChange: (quality: number) => void;
}) {
  const isPng = compressOption?.format === "png";
  const qualityPercent = Math.round((compressOption?.quality ?? 0.8) * 100);

  return (
    <Stack>
      <Text fontWeight="medium" textStyle="sm">
        圧縮
      </Text>
      <Select.Root
        collection={formatCollection}
        value={[compressOption?.format ?? "webp"]}
        onValueChange={({ value }) => onFormatChange(value[0] as OutputFormat)}
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
        value={[qualityPercent]}
        onValueChange={({ value }) => onQualityChange(value[0] ?? 80 / 100)}
      >
        {isPng ? (
          <>
            <Slider.Label>品質</Slider.Label>
            <Text textStyle="sm" color="fg.muted">
              PNG形式では品質設定は適用されません
            </Text>
          </>
        ) : (
          <>
            <Slider.Label>品質: {qualityPercent}%</Slider.Label>
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumbs />
            </Slider.Control>
          </>
        )}
      </Slider.Root>
    </Stack>
  );
}

function ProcessImageDialogContent({
  imageUrl,
  onProcessed,
}: {
  imageUrl: string;
  onProcessed: (result: ProcessedImageResult) => void;
}) {
  const dialog = useDialogContext();

  const {
    originalImage,
    processedImage,
    resizeOption,
    compressOption,
    isPending,
    updateResize,
    updateCompress,
  } = useImageProcessor(imageUrl, () => dialog.setOpen(false));

  const processedUrl = useObjectUrl(processedImage?.blob);

  const handleSave = () => {
    if (!processedImage) return;
    try {
      const file = new File([processedImage.blob], `image.${compressOption?.format}`, {
        type: `image/${compressOption?.format}`,
      });
      onProcessed({
        file,
        width: processedImage.meta.width,
        height: processedImage.meta.height,
      });
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
  const exceedsMaxSize = !!processedImage && processedImage.blob.size > MAX_FILE_SIZE;

  return (
    <Dialog.Content maxH="95vh" display="grid" gridTemplateRows="auto minmax(0, 1fr) auto">
      <Dialog.Header>
        <Dialog.Title>画像を編集</Dialog.Title>
        <Dialog.Description>リサイズや圧縮の設定ができます</Dialog.Description>
      </Dialog.Header>

      <Dialog.Body overflowY="auto">
        <Grid columns={{ base: 1, md: 2 }} gap="5" w="full">
          {/* Preview Panel */}
          {isLoaded ? (
            <ImageCompareViewer originalUrl={imageUrl} processedUrl={processedUrl} />
          ) : (
            <Box bg="gray.2" rounded="l2" display="grid" placeItems="center" minH="48">
              <Spinner size="lg" />
            </Box>
          )}

          {/* Controls Panel */}
          {isLoaded && (
            <Stack gap="6">
              <ResizeSection
                originalImage={originalImage}
                resizeOption={resizeOption}
                onResizeChange={updateResize}
              />
              <CompressSection
                compressOption={compressOption}
                onFormatChange={(format) => updateCompress({ format })}
                onQualityChange={(quality) => updateCompress({ quality })}
              />
            </Stack>
          )}
        </Grid>
      </Dialog.Body>

      <Dialog.Footer>
        <FileSizeIndicator
          original={originalImage?.blob}
          processed={processedImage?.blob}
          exceedsMax={exceedsMaxSize}
        />
        <Dialog.ActionTrigger asChild>
          <Button variant="outline" size="md">
            キャンセル
          </Button>
        </Dialog.ActionTrigger>
        <Button
          onClick={handleSave}
          loading={isPending}
          disabled={isPending || !isLoaded || exceedsMaxSize}
          size="md"
          variant="solid"
        >
          適用
        </Button>
      </Dialog.Footer>

      <Dialog.CloseTrigger asChild>
        <CloseButton />
      </Dialog.CloseTrigger>
    </Dialog.Content>
  );
}

function FileSizeIndicator({
  original,
  processed,
  exceedsMax,
}: {
  original: Blob | undefined;
  processed: Blob | undefined;
  exceedsMax: boolean;
}) {
  const ratio = original && processed ? Math.round((processed.size / original.size) * 100) : null;

  return (
    <Stack gap="0.5" flex="1" alignItems="flex-end">
      <Flex textStyle="xs" color="fg.muted" alignItems="center" gap="1">
        <Box whiteSpace="nowrap">
          {original ? (
            <Format.Byte value={original.size} unitSystem="binary" />
          ) : (
            <SkeletonText noOfLines={1} w="8" />
          )}
        </Box>
        <Icon size="2xs">
          <ArrowRightIcon />
        </Icon>
        <Flex gap="1" whiteSpace="nowrap">
          {processed ? (
            <Format.Byte value={processed.size} unitSystem="binary" />
          ) : (
            <SkeletonText w="16" noOfLines={1} />
          )}
          {ratio !== null && <Text>({ratio}%)</Text>}
        </Flex>
      </Flex>
      {exceedsMax && (
        <Text textStyle="xs" color="error">
          ファイルサイズが
          <Format.Byte value={MAX_FILE_SIZE} unitSystem="binary" />
          を超えています
        </Text>
      )}
    </Stack>
  );
}
