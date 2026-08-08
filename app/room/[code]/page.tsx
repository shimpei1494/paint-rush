"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePlayerIdentity } from "@/lib/player";
import { JOIN_ERROR_MESSAGES } from "@/lib/messages";
import LobbySection from "@/components/LobbySection";
import CountdownSection from "@/components/CountdownSection";
import PlayingSection from "@/components/PlayingSection";
import ResultSection from "@/components/ResultSection";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();

  const { playerId, name, ready } = usePlayerIdentity();
  const joinRoom = useMutation(api.rooms.joinRoom);
  const room = useQuery(api.rooms.getRoom, code ? { code } : "skip");

  const [joinError, setJoinError] = useState<string | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!ready || !playerId || !code || joinedRef.current) return;
    joinedRef.current = true;
    void (async () => {
      const res = await joinRoom({ code, playerId, name });
      if (!res.ok) {
        setJoinError(JOIN_ERROR_MESSAGES[res.reason] ?? "参加できませんでした");
      }
    })();
  }, [ready, playerId, code, name, joinRoom]);

  if (!ready || room === undefined) {
    return <CenteredMessage text="読み込み中…" />;
  }

  if (joinError) {
    return <CenteredMessage text={joinError} showHomeLink />;
  }

  if (room === null) {
    return <CenteredMessage text="部屋が見つかりません" showHomeLink />;
  }

  if (!playerId) {
    return <CenteredMessage text="読み込み中…" />;
  }

  const { room: roomDoc, players } = room;

  return (
    <main className="mx-auto min-h-dvh max-w-2xl">
      {roomDoc.status === "lobby" && (
        <LobbySection room={roomDoc} players={players} playerId={playerId} code={code} />
      )}
      {roomDoc.status === "countdown" && roomDoc.startsAt !== undefined && (
        <CountdownSection startsAt={roomDoc.startsAt} />
      )}
      {roomDoc.status === "playing" && (
        <PlayingSection room={roomDoc} players={players} playerId={playerId} />
      )}
      {roomDoc.status === "finished" && (
        <ResultSection room={roomDoc} playerId={playerId} players={players} />
      )}
    </main>
  );
}

function CenteredMessage({ text, showHomeLink }: { text: string; showHomeLink?: boolean }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xl text-neutral-300">{text}</p>
      {showHomeLink && (
        <Link href="/" className="text-emerald-400 underline underline-offset-4">
          トップへ戻る
        </Link>
      )}
    </main>
  );
}
