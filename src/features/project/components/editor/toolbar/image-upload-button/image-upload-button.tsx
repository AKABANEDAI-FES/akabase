import { memo, useCallback, useRef, useState } from "react";
import { ImageIcon, LoaderCircleIcon } from "lucide-react";
import { useTiptapEditor } from "../../hooks/use-tiptap-editor";
import { ToolbarButton } from "../toolbar-button";
import { useUploadImageMutation } from "@/features/shared/actions/mutations";
import { ProcessImageDialog } from "@/features/shared/components/process-image-dialog";
import type { ProcessedImageResult } from "@/features/shared/components/process-image-dialog";
import { toaster } from "@/components/ui";
import type { AllowedImageType, ImageScope } from "@/domain/shared/storage";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  STORAGE_ERROR_MESSAGES,
} from "@/domain/shared/storage";
import type { Editor } from "@tiptap/react";
import { css } from "@archive/styled-system/css";

const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

export interface ImageUploadButtonProps {
  editor?: Editor | null;
  scope: ImageScope;
}

export const ImageUploadButton = memo<ImageUploadButtonProps>(
  ({ editor: providedEditor, scope }) => {
    const { editor } = useTiptapEditor(providedEditor);
    const inputRef = useRef<HTMLInputElement>(null);
    const uploadMutation = useUploadImageMutation();
    const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);

    const uploadFile = useCallback(
      (file: File, dimensions?: { width: number; height: number }) => {
        if (!editor) return;

        if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
          toaster.create({
            type: "error",
            title: "ファイル形式エラー",
            description: STORAGE_ERROR_MESSAGES.INVALID_FILE_TYPE,
          });
          return;
        }

        uploadMutation.mutate(
          { file, scope },
          {
            onSuccess: (result) => {
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "image",
                  attrs: {
                    src: result.url,
                    ...dimensions,
                  },
                })
                .run();
            },
            onError: (error) => {
              toaster.create({
                type: "error",
                title: "アップロードエラー",
                description: error.message,
              });
            },
          },
        );
      },
      [editor, uploadMutation, scope],
    );

    const handleClick = useCallback(() => {
      inputRef.current?.click();
    }, []);

    const handleInputChange = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (inputRef.current) inputRef.current.value = "";
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
          setPendingFileUrl(URL.createObjectURL(file));
          return;
        }

        const bitmap = await createImageBitmap(file);
        const dimensions = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        uploadFile(file, dimensions);
      },
      [uploadFile],
    );

    const clearPendingFile = () => {
      if (pendingFileUrl) {
        URL.revokeObjectURL(pendingFileUrl);
        setPendingFileUrl(null);
      }
    };

    const handlePendingProcessed = (result: ProcessedImageResult) => {
      clearPendingFile();
      uploadFile(result.file, { width: result.width, height: result.height });
    };

    const handlePendingDialogChange = (details: { open: boolean }) => {
      if (!details.open) clearPendingFile();
    };

    const isDisabled = !editor || !editor.isEditable || uploadMutation.isPending;

    return (
      <>
        <ToolbarButton label="画像を挿入" disabled={isDisabled} onClick={handleClick}>
          {uploadMutation.isPending ? <LoaderCircleIcon className={spinnerStyle} /> : <ImageIcon />}
        </ToolbarButton>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleInputChange}
          className={hiddenInputStyle}
          tabIndex={-1}
          aria-hidden="true"
        />
        {pendingFileUrl && (
          <ProcessImageDialog
            imageUrl={pendingFileUrl}
            onProcessed={handlePendingProcessed}
            open={!!pendingFileUrl}
            onOpenChange={handlePendingDialogChange}
          />
        )}
      </>
    );
  },
);

ImageUploadButton.displayName = "ImageUploadButton";

const hiddenInputStyle = css({
  srOnly: true,
});

const spinnerStyle = css({
  animation: "spin",
});
