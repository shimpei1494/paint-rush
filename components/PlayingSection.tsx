"use client";

import { useCallback, useState } from "react";
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

  const handlePaint = useCallback(
    (x: number, y: number) => {
      void paint({ roomId: room._id, playerId, x, y });
    },
    [paint, room._id, playerId],
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
        onPaint={myColor ? handlePaint : undefined}
      />
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
