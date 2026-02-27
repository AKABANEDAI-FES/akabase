import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner, toaster } from "@/components/ui";
import { css, cx } from "styled-system/css";
import { ImagePlusIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import { useUploadImageMutation } from "../actions/mutations";
import type { AllowedImageType } from "@/domain/shared/storage";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  STORAGE_ERROR_MESSAGES,
} from "@/domain/shared/storage";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (imageId: string | null) => void;
  disabled?: boolean;
}

const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

export function ImageUpload({ currentImageUrl, onImageChange, disabled }: ImageUploadProps) {
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

      uploadMutation.mutate(file, {
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
      });
    },
    [uploadMutation, onImageChange, currentImageUrl],
  );

  const handleClick = () => {
    if (isDisabled) return;
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDisabled) return;
    // Revoke blob URL before removing
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
    <div className={wrapperStyle}>
      <div
        className={cx(uploadAreaStyle, hasImage && hasImageStyle, isDisabled && disabledStyle)}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label="画像をアップロード"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleInputChange}
          className={hiddenInputStyle}
          disabled={isDisabled}
          aria-hidden="true"
          tabIndex={-1}
        />

        {hasImage ? (
          <>
            <img src={previewUrl} alt="プレビュー" className={previewImageStyle} />
            <div className={hoverOverlayStyle}>
              <ImagePlusIcon size={20} />
              <span className={overlayTextStyle}>変更</span>
            </div>
          </>
        ) : (
          <div className={placeholderStyle}>
            <UploadCloudIcon size={28} className={placeholderIconStyle} />
            <span className={placeholderTextStyle}>クリックして選択</span>
          </div>
        )}

        {uploadMutation.isPending && (
          <div className={loadingOverlayStyle}>
            <Spinner size="lg" />
          </div>
        )}
      </div>

      {hasImage && !isDisabled && (
        <button
          type="button"
          onClick={handleRemove}
          className={removeButtonStyle}
          aria-label="画像を削除"
        >
          <Trash2Icon size={14} />
          <span>削除</span>
        </button>
      )}
    </div>
  );
}

const wrapperStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "1.5",
});

const uploadAreaStyle = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36",
  height: "36",
  borderRadius: "l3",
  borderWidth: "1px",
  borderStyle: "dashed",
  borderColor: "gray.surface.border",
  cursor: "pointer",
  overflow: "hidden",
  transition: "backgrounds",
  bg: "gray.surface.bg",
  _hover: {
    bg: "gray.surface.bg.hover",
  },
  focusVisibleRing: "outside",
});

const hasImageStyle = css({
  borderStyle: "solid",
  bg: "gray.surface.bg",
  _hover: {
    bg: "gray.surface.bg",
  },
});

const disabledStyle = css({
  layerStyle: "disabled",
  cursor: "not-allowed",
  _hover: {
    bg: "gray.surface.bg",
  },
});

const hiddenInputStyle = css({
  srOnly: true,
});

const previewImageStyle = css({
  width: "100%",
  height: "100%",
  objectFit: "contain",
  padding: "3",
});

const hoverOverlayStyle = css({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1",
  bg: "transparent",
  color: "transparent",
  transition: "colors",
  borderRadius: "l3",
  ".group:hover &, [role=button]:hover &": {
    bg: "black.a7",
    color: "white",
  },
});

const overlayTextStyle = css({
  fontSize: "xs",
  fontWeight: "medium",
});

const removeButtonStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  textStyle: "xs",
  color: "fg.muted",
  cursor: "pointer",
  transition: "colors",
  bg: "transparent",
  border: "none",
  padding: "0",
  _hover: {
    color: "fg.error",
  },
});

const placeholderStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1.5",
  padding: "4",
  textAlign: "center",
});

const placeholderIconStyle = css({
  color: "fg.subtle",
});

const placeholderTextStyle = css({
  fontSize: "xs",
  color: "fg.muted",
  lineHeight: "tight",
});

const loadingOverlayStyle = css({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  bg: "white.a9",
  borderRadius: "l3",
  zIndex: 10,
});
