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
  /** スタートマス(奪われない保護マス)。マーカー表示に使う。 */
  startCells?: GridCellData[];
  /** 自分のチーム色。指定すると隣接ルールで塗れる未塗装マスを少し明るく表示する。 */
  highlightColor?: string;
  /**
   * Omit (or leave undefined) for a read-only grid — e.g. the /screen view.
   * Return false to indicate the tap was invalid (no cooldown is consumed).
   */
  onPaint?: (x: number, y: number) => boolean | void;
}

/**
 * Renders `gridSize * gridSize` cells from a sparse painted-cells array.
 * Applies a client-side paint cooldown (via a ref, no re-render) so rapid
 * taps never spam the server, and hands each `Cell` a single stable
 * callback so unaffected cells never re-render when others change color.
 */
export default function Grid({
  gridSize,
  cells,
  startCells,
  highlightColor,
  onPaint,
}: GridProps) {
  const cellMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cells) {
      m.set(c.y * gridSize + c.x, c.color);
    }
    return m;
  }, [cells, gridSize]);

  const startKeySet = useMemo(() => {
    const s = new Set<number>();
    for (const c of startCells ?? []) {
      s.add(c.y * gridSize + c.x);
    }
    return s;
  }, [startCells, gridSize]);

  // 自色マスの4近傍のうち未塗装のマス = 隣接ルールで今すぐ塗れる空きマス
  const paintableKeySet = useMemo(() => {
    const s = new Set<number>();
    if (!highlightColor) return s;
    for (const c of cells) {
      if (c.color !== highlightColor) continue;
      for (const [nx, ny] of [
        [c.x - 1, c.y],
        [c.x + 1, c.y],
        [c.x, c.y - 1],
        [c.x, c.y + 1],
      ]) {
        if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;
        const key = ny * gridSize + nx;
        if (!cellMap.has(key)) s.add(key);
      }
    }
    return s;
  }, [cells, cellMap, gridSize, highlightColor]);

  const onPaintRef = useRef(onPaint);
  onPaintRef.current = onPaint;

  const lastPaintAtRef = useRef(0);
  const handlePaint = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastPaintAtRef.current < PAINT_COOLDOWN_MS) return;
    // 無効なタップ(隣接していない等)はクールダウンを消費しない
    if (onPaintRef.current?.(x, y) === false) return;
    lastPaintAtRef.current = now;
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
          isStart={startKeySet.has(key)}
          paintable={paintableKeySet.has(key)}
          onPaint={onPaint ? handlePaint : undefined}
        />
      ))}
    </div>
  );
}
