// ゲーム全体の定数。フロントエンドからも `@/convex/constants` で参照する(設計メモ D8)。

export const PALETTE = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#f97316",
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export const DEFAULT_GRID_SIZE = 20;
export const MAX_GRID_CELLS = 2500; // .take() の上限
export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;
export const PAINT_COOLDOWN_MS = 300;
export const COUNTDOWN_MS = 3000;
export const ROUND_MS = 60000;
export const ROOM_CODE_LENGTH = 4;

export function isPaletteColor(c: string): c is PaletteColor {
  return (PALETTE as readonly string[]).includes(c);
}
