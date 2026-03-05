import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, IconButton, Spinner, Text, toaster } from "@/components/ui";
import { css } from "styled-system/css";
import { UploadCloudIcon, XIcon } from "lucide-react";
import { useUploadImageMutation } from "../actions/mutations";
import type { AllowedImageType, ImageScope } from "@/domain/shared/storage";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  STORAGE_ERROR_MESSAGES,
} from "@/domain/shared/storage";
import { Box } from "styled-system/jsx";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (imageId: string | null) => void;
  disabled?: boolean;
  scope: ImageScope;
}

const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

export function ImageUpload({ currentImageUrl, onImageChange, disabled, scope }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadImageMutation();

  const isDisabled = disabled || uploadMutation.isPending;
  const hasImage = !!previewUrl;

  const validateAndUpload = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toaster.create({
          type: "error",
          title: "ファイルサイズエラー",
          description: STORAGE_ERROR_MESSAGES.FILE_TOO_LARGE,
        });
        return;
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
        toaster.create({
          type: "error",
          title: "ファイル形式エラー",
          description: STORAGE_ERROR_MESSAGES.INVALID_FILE_TYPE,
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
    if (isDisabled || hasImage) return;
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = () => {
    if (isDisabled) return;
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
      {hasImage ? (
        <img
          src={previewUrl ?? undefined}
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
      {hasImage && !isDisabled && (
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
    </Box>
  );
}
