/**
 * 企画詳細情報の入力フィールド定義
 * 下書き編集フォームと公開データ編集フォームで共通
 */
export const PROJECT_DETAIL_INFO_FIELDS = [
  {
    name: "openingHours",
    label: "開催時間",
    placeholder: "例: 両日 10:00〜15:00",
    helperText: "企画を開催している時間帯（提出時に必須）",
  },
] as const;
