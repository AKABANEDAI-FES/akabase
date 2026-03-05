import { Field } from "@/components/ui";
import { MAX_FILE_SIZE } from "@/domain/shared/storage";
import type { ImageScope } from "@/domain/shared/storage";
import { ImageUpload } from "@/features/shared/components/image-upload";
import { Format } from "@ark-ui/react";

interface LogoUploadFieldProps {
  currentLogoUrl?: string | null;
  onLogoChange: (logoImageId: string | null) => void;
  disabled?: boolean;
  scope: ImageScope;
}

export function LogoUploadField({
  currentLogoUrl,
  onLogoChange,
  disabled,
  scope,
}: LogoUploadFieldProps) {
  return (
    <Field.Root>
      <Field.Label>ロゴ画像（任意）</Field.Label>
      <ImageUpload
        currentImageUrl={currentLogoUrl}
        onImageChange={onLogoChange}
        disabled={disabled}
        scope={scope}
      />
      <Field.HelperText>
        JPEG、PNG、WebP形式、最大
        <Format.Byte value={MAX_FILE_SIZE} unitSystem="binary" />
        まで
      </Field.HelperText>
    </Field.Root>
  );
}
