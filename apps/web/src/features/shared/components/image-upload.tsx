import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@akabase/ui/components/icon";
import { IconButton } from "@akabase/ui/components/icon-button";
import { Spinner } from "@akabase/ui/components/spinner";
import { Text } from "@akabase/ui/components/text";
import { toaster } from "@akabase/ui/components/toast";
import { css } from "@akabase/styled-system/css";
import { PencilIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { useUploadImageMutationOption } from "../actions/mutations";
import type { AllowedImageType, ImageScope } from "@akabase/domain/shared/image";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from "@akabase/domain/shared/image";
import { Box } from "@akabase/styled-system/jsx";
import { ProcessImageDialog } from "./process-image-dialog";
import type { ProcessedImageResult } from "./process-image-dialog";
import { useMutation } from "@tanstack/react-query";

const ERROR_MESSAGES = {
  FILE_TOO_LARGE: "ファイルサイズが大きすぎます。最大300KBまで対応しています。",
  INVALID_FILE_TYPE: "無効なファイル形式です。JPG、PNG、WebPのみ対応しています。",
} as const;

type ImageUploadProps = {
  currentImageUrl?: string | null;
  onImageChange: (imageId: string | null) => void;
  disabled?: boolean;
  scope: ImageScope;
};

const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

function isAllowedImageType(type: string): boolean {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return ALLOWED_IMAGE_TYPES.includes(type as AllowedImageType);
}

export function ImageUpload({ currentImageUrl, onImageChange, disabled, scope }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useMutation(useUploadImageMutationOption());

  const isDisabled = disabled || uploadMutation.isPending;

  const validateAndUpload = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toaster.create({
          type: "error",
          title: "ファイルサイズエラー",
          description: ERROR_MESSAGES.FILE_TOO_LARGE,
        });
        return;
      }

      if (!isAllowedImageType(file.type)) {
        toaster.create({
          type: "error",
          title: "ファイル形式エラー",
          description: ERROR_MESSAGES.INVALID_FILE_TYPE,
        });
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      uploadMutation.mutate(
        { file, scope },
        {
          onSuccess: (result) => {
            onImageChange(result.imageId);
            toaster.create({
              type: "success",
              title: "アップロード完了",
              description: "画像をアップロードしました",
            });
          },
          onError: (error) => {
            URL.revokeObjectURL(objectUrl);
            setPreviewUrl(currentImageUrl ?? null);
            toaster.create({
              type: "error",
              title: "アップロードエラー",
              description: error.message,
            });
          },
        },
      );
    },
    [uploadMutation, onImageChange, currentImageUrl, scope],
  );

  const handleClick = () => {
    if (isDisabled || previewUrl) {
      return;
    }
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (!file) {
      return;
    }

    const needsProcessing = file.size > MAX_FILE_SIZE || !isAllowedImageType(file.type);

    if (needsProcessing) {
      setPendingFileUrl(URL.createObjectURL(file));
      return;
    }

    validateAndUpload(file);
  };

  const clearPendingFile = () => {
    if (pendingFileUrl) {
      URL.revokeObjectURL(pendingFileUrl);
      setPendingFileUrl(null);
    }
  };

  const handlePendingProcessed = (result: ProcessedImageResult) => {
    clearPendingFile();
    validateAndUpload(result.file);
  };

  const handlePendingDialogChange = (details: { open: boolean }) => {
    if (!details.open) {
      clearPendingFile();
    }
  };

  const handleRemove = () => {
    if (isDisabled) {
      return;
    }
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onImageChange(null);
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Box display="inline-grid" position="relative" boxSize="36" rounded="l3" overflow="hidden">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleInputChange}
        className={css({ display: "none" })}
        disabled={isDisabled}
        aria-hidden="true"
        tabIndex={-1}
      />
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="プレビュー"
          className={css({
            boxSize: "full",
            objectFit: "contain",
          })}
        />
      ) : (
        <button
          type="button"
          className={css({
            display: "grid",
            placeItems: "center",
            placeContent: "center",
            gap: "1.5",
            boxSize: "full",
            borderWidth: "1px",
            borderStyle: "dashed",
            borderColor: "gray.surface.border",
            rounded: "l3",
            bg: "gray.surface.bg",
            cursor: "pointer",
            transition: "colors",
            _hover: {
              bg: "gray.surface.bg.hover",
            },
          })}
          onClick={handleClick}
          disabled={isDisabled}
        >
          <Icon boxSize="8" color="fg.muted">
            <UploadCloudIcon />
          </Icon>
          <Text as="span" textStyle="xs" color="fg.muted">
            クリックして選択
          </Text>
        </button>
      )}
      {previewUrl && !isDisabled && (
        <Box position="absolute" top="1" right="1" display="grid" gap="1" zIndex="1">
          <IconButton
            type="button"
            onClick={handleRemove}
            aria-label="画像をクリア"
            size="2xs"
            colorPalette="gray"
          >
            <XIcon />
          </IconButton>
          <ProcessImageDialog
            imageUrl={previewUrl}
            onProcessed={(result) => validateAndUpload(result.file)}
          >
            <IconButton type="button" aria-label="画像を編集" size="2xs" colorPalette="gray">
              <PencilIcon />
            </IconButton>
          </ProcessImageDialog>
        </Box>
      )}
      {uploadMutation.isPending && (
        <Box
          position="absolute"
          inset="0"
          display="grid"
          placeItems="center"
          bg="gray.a9"
          zIndex="10"
        >
          <Spinner size="lg" color="gray.1" />
        </Box>
      )}
      {pendingFileUrl && (
        <ProcessImageDialog
          imageUrl={pendingFileUrl}
          onProcessed={handlePendingProcessed}
          open={Boolean(pendingFileUrl)}
          onOpenChange={handlePendingDialogChange}
        />
      )}
    </Box>
  );
}
