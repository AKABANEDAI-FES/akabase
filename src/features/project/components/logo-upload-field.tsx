import { Field } from "@/components/ui";
import { ImageUpload } from "@/features/shared/components/image-upload";

interface LogoUploadFieldProps {
  currentLogoUrl?: string | null;
  onLogoChange: (logoImageId: string | null) => void;
  disabled?: boolean;
}

export function LogoUploadField({ currentLogoUrl, onLogoChange, disabled }: LogoUploadFieldProps) {
  return (
    <Field.Root>
      <Field.Label>ロゴ画像（任意）</Field.Label>
      <ImageUpload
        currentImageUrl={currentLogoUrl}
        onImageChange={onLogoChange}
        disabled={disabled}
      />
      <Field.HelperText>JPEG、PNG、WebP形式、最大2MBまで</Field.HelperText>
    </Field.Root>
  );
}
