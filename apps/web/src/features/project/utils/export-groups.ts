import type { EventPublishedDataItem } from "@akabase/application/query/project/list-event-published-data";

export type ExportGroup = {
  name: string;
  items: EventPublishedDataItem[];
};

const UNCATEGORIZED_NAME = "未分類";

/**
 * 企画区分ごとにまとめ、区分の表示順に並べる
 * 区分が未設定の企画は「未分類」として末尾にまとめる
 */
export function groupByCategory(data: EventPublishedDataItem[]): ExportGroup[] {
  const groups = new Map<
    string,
    { name: string; order: number; items: EventPublishedDataItem[] }
  >();
  const uncategorized: EventPublishedDataItem[] = [];

  for (const item of data) {
    if (item.categoryId === null) {
      uncategorized.push(item);
      continue;
    }
    const group = groups.get(item.categoryId) ?? {
      name: item.categoryName ?? "",
      order: item.categoryDisplayOrder ?? 0,
      items: [],
    };
    group.items.push(item);
    groups.set(item.categoryId, group);
  }

  const sorted = [...groups.values()]
    .toSorted((a, b) => a.order - b.order)
    .map(({ name, items }) => ({ name, items }));

  return uncategorized.length > 0
    ? [...sorted, { name: UNCATEGORIZED_NAME, items: uncategorized }]
    : sorted;
}

// Excel のシート名に使えない文字。ファイル名に使えない文字も含めている
const INVALID_NAME_CHARS = /[[\]:*?/\\"<>|]/g;
// Excel のシート名の上限
const MAX_NAME_LENGTH = 31;

/**
 * 区分名をファイル名とシート名に使える形にして `safeName` として付ける
 * 重複には連番を付ける
 */
export function withSafeNames<T extends { name: string }>(
  groups: T[],
): (T & { safeName: string })[] {
  // Excel はシート名の重複を大文字小文字を区別せずに判定する
  const used = new Set<string>();
  return groups.map((group) => {
    const base = sanitizeName(group.name);
    let candidate = base;
    for (let n = 2; used.has(candidate.toLowerCase()); n += 1) {
      const suffix = ` (${n})`;
      candidate = base.slice(0, MAX_NAME_LENGTH - suffix.length) + suffix;
    }
    used.add(candidate.toLowerCase());
    return { ...group, safeName: candidate };
  });
}

// 先頭と末尾の空白とアポストロフィを取り除く。シート名は先頭末尾のアポストロフィが禁止
function trimEdges(name: string): string {
  return name.replaceAll(/^[\s']+|[\s']+$/g, "");
}

function sanitizeName(name: string): string {
  const cleaned = trimEdges(name.replaceAll(INVALID_NAME_CHARS, "_"));
  // 空と "History" (Excel の予約名) はそのままでは使えない
  const safe = cleaned === "" || cleaned.toLowerCase() === "history" ? `${cleaned}_` : cleaned;
  // 切り詰めで末尾に空白やアポストロフィが出ることがあるので、もう一度取り除く
  return trimEdges(safe.slice(0, MAX_NAME_LENGTH)) || "_";
}
