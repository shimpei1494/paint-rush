"use client";

import { useCallback, useMemo, useRef } from "react";
import { PAINT_COOLDOWN_MS } from "@/convex/constants";
import Cell from "./Cell";

export interface GridCellData {
  x: number;
  y: number;
  color: string;
}

interface GridProps {
  gridSize: number;
  cells: GridCellData[];
  /** Omit (or leave undefined) for a read-only grid — e.g. the /screen view. */
  onPaint?: (x: number, y: number) => void;
}

/**
 * Renders `gridSize * gridSize` cells from a sparse painted-cells array.
 * Applies a client-side paint cooldown (via a ref, no re-render) so rapid
 * taps never spam the server, and hands each `Cell` a single stable
 * callback so unaffected cells never re-render when others change color.
 */
export default function Grid({ gridSize, cells, onPaint }: GridProps) {
  const cellMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cells) {
      m.set(c.y * gridSize + c.x, c.color);
    }
    return m;
  }, [cells, gridSize]);

  const onPaintRef = useRef(onPaint);
  onPaintRef.current = onPaint;

  const lastPaintAtRef = useRef(0);
  const handlePaint = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastPaintAtRef.current < PAINT_COOLDOWN_MS) return;
    lastPaintAtRef.current = now;
    onPaintRef.current?.(x, y);
  }, []);

  const items = useMemo(() => {
    const out: Array<{ x: number; y: number; key: number }> = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        out.push({ x, y, key: y * gridSize + x });
      }
    }
    return out;
  }, [gridSize]);

  return (
    <div
      className="no-tap aspect-square w-full rounded-lg bg-neutral-900 p-1"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        gap: "2px",
      }}
    >
      {items.map(({ x, y, key }) => (
        <Cell
          key={key}
          x={x}
          y={y}
          color={cellMap.get(key)}
          onPaint={onPaint ? handlePaint : undefined}
        />
      ))}
    </div>
  );
}
