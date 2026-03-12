import { Field } from "@archive/ui/components/field";
import { Input } from "@archive/ui/components/input";
import type { EmailFieldProps } from "./add-member-dialog";

export function EmailInput({ value, onChange }: EmailFieldProps) {
  return (
    <>
      <Field.Label>メールアドレス</Field.Label>
      <Input
        type="email"
        placeholder="example@toyo.jp"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </>
  );
}
