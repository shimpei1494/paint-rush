"use client";

import { memo } from "react";

export const UNPAINTED_COLOR = "#3f3f46"; // neutral-700, unpainted cell fill

interface CellProps {
  x: number;
  y: number;
  color?: string;
  /** Stable callback — same reference across renders (see Grid.tsx). */
  onPaint?: (x: number, y: number) => void;
}

function CellImpl({ x, y, color, onPaint }: CellProps) {
  return (
    <div
      className="no-tap aspect-square rounded-[2px]"
      style={{ backgroundColor: color ?? UNPAINTED_COLOR }}
      onPointerDown={onPaint ? () => onPaint(x, y) : undefined}
    />
  );
}

// React.memo: with a stable `onPaint` and unchanged x/y/color, a cell never
// re-renders when a sibling cell's color changes.
const Cell = memo(CellImpl);
export default Cell;
