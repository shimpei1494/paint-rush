"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Grid from "@/components/Grid";
import ScoreBar from "@/components/ScoreBar";
import JoinQr from "@/components/JoinQr";
import CountdownSection from "@/components/CountdownSection";
import { useOrigin } from "@/lib/useOrigin";

/** Read-only spectator / projector view. No identity, no join call, no paint handlers. */
export default function ScreenPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();

  const room = useQuery(api.rooms.getRoom, code ? { code } : "skip");
  const roomId = room?.room._id;
  const cells = useQuery(api.game.getCells, roomId ? { roomId } : "skip");

  const origin = useOrigin();
  const joinUrl = origin ? `${origin}/room/${code}` : "";

  if (room === undefined) {
    return <CenteredMessage text="読み込み中…" />;
  }
  if (room === null) {
    return <CenteredMessage text="部屋が見つかりません" />;
  }

  const { room: roomDoc } = room;

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between gap-6">
        <p className="text-5xl font-black tracking-[0.2em] text-white">{code}</p>
        {joinUrl && <JoinQr url={joinUrl} />}
      </div>

      {roomDoc.status === "countdown" && roomDoc.startsAt !== undefined && (
        <CountdownSection startsAt={roomDoc.startsAt} />
      )}

      {(roomDoc.status === "playing" || roomDoc.status === "finished") && (
        <>
          <ScoreBar
            cells={cells ?? []}
            gridSize={roomDoc.gridSize}
            endsAt={roomDoc.status === "playing" ? roomDoc.endsAt : undefined}
          />
          <Grid gridSize={roomDoc.gridSize} cells={cells ?? []} />
        </>
      )}

      {roomDoc.status === "lobby" && (
        <p className="text-center text-2xl text-neutral-400">
          参加者を待っています…
        </p>
      )}
    </main>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-xl text-neutral-300">{text}</p>
    </main>
  );
}
