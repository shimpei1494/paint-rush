"use client";

import { memo } from "react";

export const UNPAINTED_COLOR = "#3f3f46"; // neutral-700, unpainted cell fill
const PAINTABLE_COLOR = "#5b5b66"; // 未塗装だが自色隣接で塗れるマスは少し明るくする

interface CellProps {
  x: number;
  y: number;
  color?: string;
  /** スタートマス(奪われない保護マス)。白いドットで表示する。 */
  isStart?: boolean;
  /** 未塗装かつ自色に隣接していて塗れるマス。 */
  paintable?: boolean;
  /** Stable callback — same reference across renders (see Grid.tsx). */
  onPaint?: (x: number, y: number) => void;
}

function CellImpl({ x, y, color, isStart, paintable, onPaint }: CellProps) {
  return (
    <div
      className="no-tap flex aspect-square items-center justify-center rounded-[2px]"
      style={{
        backgroundColor: color ?? (paintable ? PAINTABLE_COLOR : UNPAINTED_COLOR),
      }}
      onPointerDown={onPaint ? () => onPaint(x, y) : undefined}
    >
      {isStart && (
        <span className="block h-1/2 w-1/2 rounded-full border-2 border-white/90" />
      )}
    </div>
  );
}

// React.memo: with a stable `onPaint` and unchanged props, a cell never
// re-renders when a sibling cell's color changes.
const Cell = memo(CellImpl);
export default Cell;
