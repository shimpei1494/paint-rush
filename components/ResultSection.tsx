"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { PALETTE } from "@/convex/constants";
import { teamName } from "@/lib/colors";
import Grid from "./Grid";

interface ResultSectionProps {
  room: Doc<"rooms">;
  playerId: string;
  players: Doc<"players">[];
}

export default function ResultSection({ room, playerId, players }: ResultSectionProps) {
  const cells = useQuery(api.game.getCells, { roomId: room._id });
  const resetRoom = useMutation(api.game.resetRoom);
  const isHost = room.hostPlayerId === playerId;
  const me = players.find((p) => p.playerId === playerId);

  const ranking = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cells ?? []) {
      counts.set(c.color, (counts.get(c.color) ?? 0) + 1);
    }
    // 塗られた色だけでなく、プレイヤーが所属する色も 0 マスで結果に出す
    const colors = new Set([...counts.keys(), ...players.map((p) => p.color)]);
    const palette: readonly string[] = PALETTE;
    return [...colors]
      .map((color): [string, number] => [color, counts.get(color) ?? 0])
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return palette.indexOf(a[0]) - palette.indexOf(b[0]);
      });
  }, [cells, players]);

  const topScore = ranking[0]?.[1] ?? 0;
  const winners = ranking.filter(([, count]) => count === topScore && topScore > 0);
  const isTie = winners.length > 1;
  const isMyColorWinner = me !== undefined && winners.some(([color]) => color === me.color);

  return (
    <div className="flex flex-col items-center gap-8 px-4 py-8">
      <div className="flex flex-col items-center gap-3">
        {ranking.length === 0 || topScore === 0 ? (
          <p className="text-2xl text-neutral-400">誰も塗りませんでした</p>
        ) : isTie ? (
          <>
            <p className="text-2xl font-bold text-neutral-200">引き分け</p>
            <div className="flex gap-3">
              {winners.map(([color]) => (
                <span
                  key={color}
                  className="h-16 w-16 rounded-2xl"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            {isMyColorWinner && (
              <p className="text-emerald-400 font-bold">あなたのチームです</p>
            )}
          </>
        ) : (
          <>
            <p className="text-lg text-neutral-400">優勝</p>
            <span
              className="h-24 w-24 rounded-3xl"
              style={{ backgroundColor: winners[0][0] }}
            />
            <p className="text-2xl font-bold text-white">
              {teamName(winners[0][0])}
            </p>
            {isMyColorWinner && (
              <p className="text-emerald-400 font-bold">あなたのチームです</p>
            )}
          </>
        )}
      </div>

      {/* 最終盤面。onPaint を渡さないので読み取り専用 */}
      <div className="w-full max-w-md">
        <Grid gridSize={room.gridSize} cells={cells ?? []} />
      </div>

      <div className="w-full max-w-md">
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">結果</h2>
        <ul className="flex flex-col gap-2">
          {ranking.map(([color, count]) => {
            const teammates = players.filter((p) => p.color === color);
            const teammateNames = teammates
              .map((p) => (p.playerId === playerId ? `${p.name}(あなた)` : p.name))
              .join("、");
            const isMyTeam = me?.color === color;
            return (
              <li
                key={color}
                className={`flex flex-col gap-1 rounded-lg bg-neutral-800 px-4 py-3 ${
                  isMyTeam ? "ring-2 ring-emerald-400" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-6 w-6 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="flex flex-1 items-center gap-2 text-white">
                    {teamName(color)}
                    {isMyTeam && (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                        あなた
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-lg text-white">{count}</span>
                </div>
                {teammates.length > 0 && (
                  <p className="text-sm text-neutral-400">{teammateNames}</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {isHost && (
        <button
          type="button"
          onClick={() => void resetRoom({ roomId: room._id, playerId })}
          className="no-tap w-full max-w-md rounded-xl bg-emerald-500 py-4 text-xl font-bold text-white transition active:scale-95"
        >
          もう一回
        </button>
      )}
    </div>
  );
}
