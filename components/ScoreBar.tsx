"use client";

import { useMemo } from "react";
import { PALETTE } from "@/convex/constants";
import { useNow } from "@/lib/useNow";

export interface ScoreCell {
  x: number;
  y: number;
  color: string;
}

interface ScoreBarProps {
  cells: ScoreCell[];
  gridSize: number;
  /** Epoch ms when the round ends. Omit to hide the remaining-time readout. */
  endsAt?: number;
  /** 自分のチーム色。指定するとその凡例を強調する。 */
  highlightColor?: string;
}

/** Single horizontal stacked bar of per-color cell share, plus counts and a live remaining-time readout. */
export default function ScoreBar({ cells, gridSize, endsAt, highlightColor }: ScoreBarProps) {
  const now = useNow(100);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cells) {
      m.set(c.color, (m.get(c.color) ?? 0) + 1);
    }
    return m;
  }, [cells]);

  const total = gridSize * gridSize;
  const painted = cells.length;
  const unpainted = Math.max(0, total - painted);

  const remainingSeconds =
    endsAt !== undefined && now > 0
      ? Math.max(0, Math.ceil((endsAt - now) / 1000))
      : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-neutral-700">
        {PALETTE.map((color) => {
          const count = counts.get(color) ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={color}
              style={{ width: `${(count / total) * 100}%`, backgroundColor: color }}
            />
          );
        })}
        {unpainted > 0 && (
          <div
            style={{ width: `${(unpainted / total) * 100}%` }}
            className="bg-neutral-700"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {PALETTE.map((color) => {
            const isMine = color === highlightColor;
            return (
              <span key={color} className="flex items-center gap-1 text-sm text-neutral-200">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${isMine ? "ring-2 ring-white" : ""}`}
                  style={{ backgroundColor: color }}
                />
                <span className={isMine ? "font-bold text-white" : ""}>
                  {counts.get(color) ?? 0}
                </span>
              </span>
            );
          })}
        </div>
        {remainingSeconds !== null && (
          <span
            className={`font-mono text-xl font-bold tabular-nums ${
              remainingSeconds < 10 ? "text-red-500" : "text-white"
            }`}
          >
            残り {remainingSeconds}秒
          </span>
        )}
      </div>
    </div>
  );
}
