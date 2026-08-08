"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
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
    </div>
  );
}
