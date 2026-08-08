"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import ConfirmDialog from "./ConfirmDialog";
import Grid from "./Grid";
import MyTeamBanner from "./MyTeamBanner";
import ScoreBar from "./ScoreBar";

interface PlayingSectionProps {
  room: Doc<"rooms">;
  players: Doc<"players">[];
  playerId: string;
}

export default function PlayingSection({ room, players, playerId }: PlayingSectionProps) {
  const cells = useQuery(api.game.getCells, { roomId: room._id });
  const me = players.find((p) => p.playerId === playerId);
  const myColor = me?.color;
  const isHost = room.hostPlayerId === playerId;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const endRound = useMutation(api.game.endRoundByHost);

  const paint = useMutation(api.game.paint).withOptimisticUpdate((localStore, args) => {
    if (!myColor) return;
    const cur = localStore.getQuery(api.game.getCells, { roomId: args.roomId });
    if (cur === undefined) return;
    const i = cur.findIndex((c) => c.x === args.x && c.y === args.y);
    const next =
      i >= 0
        ? cur.map((c, n) => (n === i ? { ...c, color: myColor } : c))
        : [...cur, { x: args.x, y: args.y, color: myColor }];
    localStore.setQuery(api.game.getCells, { roomId: args.roomId }, next);
  });

  const cellMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cells ?? []) {
      m.set(c.y * room.gridSize + c.x, c.color);
    }
    return m;
  }, [cells, room.gridSize]);

  // サーバーの paint と同じ判定(保護マス+自色隣接)を先に行い、
  // 無効なタップは送信も楽観的更新もしない(戦略性改善検討 S1)
  const canPaint = useCallback(
    (x: number, y: number): boolean => {
      if (!myColor) return false;
      const startCell = room.startCells?.find((s) => s.x === x && s.y === y);
      if (startCell && startCell.color !== myColor) return false;
      return [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([nx, ny]) => cellMap.get(ny * room.gridSize + nx) === myColor);
    },
    [myColor, room.startCells, room.gridSize, cellMap],
  );

  const handlePaint = useCallback(
    (x: number, y: number): boolean => {
      if (!canPaint(x, y)) return false;
      void paint({ roomId: room._id, playerId, x, y });
      return true;
    },
    [canPaint, paint, room._id, playerId],
  );

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <MyTeamBanner players={players} playerId={playerId} />
      <ScoreBar
        cells={cells ?? []}
        gridSize={room.gridSize}
        endsAt={room.endsAt}
        highlightColor={myColor}
      />
      <Grid
        gridSize={room.gridSize}
        cells={cells ?? []}
        startCells={room.startCells}
        highlightColor={myColor}
        onPaint={myColor ? handlePaint : undefined}
      />
      <p className="text-center text-sm text-neutral-400">
        ◯のスタート地点から、自分の色のとなりのマスだけ塗れる
      </p>
      {isHost ? (
        <button
          type="button"
          className="no-tap w-full rounded-xl border border-red-500/60 py-3 font-bold text-red-400 transition active:scale-95"
          onClick={() => setConfirmOpen(true)}
        >
          ゲームを終了
        </button>
      ) : null}
      {confirmOpen ? (
        <ConfirmDialog
          title="ゲームを終了しますか？"
          description="結果画面に移ります。ロビーに戻してやり直したい場合は、結果画面の「もう一回」を押してください。"
          confirmLabel="終了する"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            void endRound({ roomId: room._id, playerId });
          }}
        />
      ) : null}
    </div>
  );
}
