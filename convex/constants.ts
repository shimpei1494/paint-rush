// ゲーム全体の定数。フロントエンドからも `@/convex/constants` で参照する(設計メモ D8)。

export const PALETTE = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#f97316",
  "#ec4899",
  "#06b6d4",
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export const DEFAULT_GRID_SIZE = 14;
// ホストがロビーで選べる盤面サイズ(戦略性改善検討 S3)
export const GRID_SIZE_OPTIONS = [12, 14, 20] as const;
export const MAX_GRID_CELLS = 2500; // .take() の上限
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;
export const PAINT_COOLDOWN_MS = 300;
export const COUNTDOWN_MS = 3000;
export const ROUND_MS = 60000;
export const ROOM_CODE_LENGTH = 4;
export const DEFAULT_PLAYER_NAME = "プレイヤー";

export function isPaletteColor(c: string): c is PaletteColor {
  return (PALETTE as readonly string[]).includes(c);
}

export function isGridSizeOption(n: number): boolean {
  return (GRID_SIZE_OPTIONS as readonly number[]).includes(n);
}
