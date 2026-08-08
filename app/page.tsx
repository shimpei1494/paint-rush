"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePlayerIdentity } from "@/lib/player";
import { JOIN_ERROR_MESSAGES } from "@/lib/messages";

export default function Home() {
  const router = useRouter();
  const { playerId, name, ready, setName } = usePlayerIdentity();
  const createRoom = useMutation(api.rooms.createRoom);
  const joinRoom = useMutation(api.rooms.joinRoom);

  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const canSubmit = ready && !!playerId && name.trim().length > 0 && !busy;
  const needsName = ready && name.trim().length === 0;

  const handleCreate = async () => {
    if (!playerId) return;
    setBusy(true);
    setJoinError(null);
    try {
      const { code } = await createRoom({ playerId, name });
      router.push(`/room/${code}`);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!playerId || roomCode.length !== 4) return;
    setBusy(true);
    setJoinError(null);
    try {
      const res = await joinRoom({ code: roomCode, playerId, name });
      if (res.ok) {
        router.push(`/room/${roomCode}`);
      } else {
        setJoinError(JOIN_ERROR_MESSAGES[res.reason] ?? "参加できませんでした");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-10 px-6 py-12">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-black tracking-tight text-white">
          Paint Rush
        </h1>
        <p className="text-neutral-400">みんなで塗って陣取ろう</p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <label
          htmlFor="name"
          className="text-sm font-semibold text-neutral-400"
        >
          名前
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder="なまえを入力"
          maxLength={20}
          aria-describedby={needsName ? "name-hint" : undefined}
          className="no-tap w-full rounded-xl bg-neutral-800 px-4 py-4 text-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {needsName && (
          <p id="name-hint" className="text-sm text-neutral-400">
            名前を入力すると部屋を作成・参加できます
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={!canSubmit}
        className="no-tap w-full rounded-xl bg-emerald-500 py-4 text-xl font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
      >
        部屋を作る
      </button>

      <div className="flex w-full items-center gap-3">
        <div className="h-px flex-1 bg-neutral-700" />
        <span className="text-sm text-neutral-500">または</span>
        <div className="h-px flex-1 bg-neutral-700" />
      </div>

      <div className="flex w-full flex-col gap-3">
        <label
          htmlFor="code"
          className="text-sm font-semibold text-neutral-400"
        >
          部屋コードで参加
        </label>
        <input
          id="code"
          type="text"
          value={roomCode}
          onChange={(e) => {
            const next = e.target.value
              .toUpperCase()
              .replace(/[^A-Z]/g, "")
              .slice(0, 4);
            setRoomCode(next);
          }}
          placeholder="ABCD"
          maxLength={4}
          className="no-tap w-full rounded-xl bg-neutral-800 px-4 py-4 text-center text-2xl font-mono font-bold tracking-[0.3em] text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={handleJoin}
          disabled={!canSubmit || roomCode.length !== 4}
          className="no-tap w-full rounded-xl bg-neutral-700 py-4 text-xl font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          参加
        </button>
        {joinError && (
          <p className="text-center text-sm text-red-400">{joinError}</p>
        )}
      </div>
    </main>
  );
}
