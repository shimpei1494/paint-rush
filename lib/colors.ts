// パレット色 → 日本語チーム名の対応表。

const COLOR_NAMES: Record<string, string> = {
  "#ef4444": "赤",
  "#3b82f6": "青",
  "#22c55e": "緑",
  "#eab308": "黄",
  "#a855f7": "紫",
  "#f97316": "橙",
};

/** パレット色 → 日本語の色名。未知の色はそのまま色コードを返す。 */
function colorName(color: string): string {
  return COLOR_NAMES[color] ?? color;
}

/** 例: "赤チーム" */
export function teamName(color: string): string {
  return `${colorName(color)}チーム`;
}
