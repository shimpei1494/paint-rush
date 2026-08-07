"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { MIN_PLAYERS, PALETTE } from "@/convex/constants";
import { useOrigin } from "@/lib/useOrigin";
import { usePlayerIdentity } from "@/lib/player";
import JoinQr from "./JoinQr";

interface LobbySectionProps {
  room: Doc<"rooms">;
  players: Doc<"players">[];
  playerId: string;
  code: string;
}

export default function LobbySection({ room, players, playerId, code }: LobbySectionProps) {
  const changeColor = useMutation(api.rooms.changeColor);
  const startGame = useMutation(api.game.startGame);
  const joinRoom = useMutation(api.rooms.joinRoom);
  const { setName: persistName } = usePlayerIdentity();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const isHost = room.hostPlayerId === playerId;
  const me = players.find((p) => p.playerId === playerId);
  const origin = useOrigin();
  const joinUrl = origin ? `${origin}/room/${code}` : "";

  // QR から入ってきた人は名前を入れる画面を通っていないので、ここで変えられるようにする。
  // joinRoom は同じ playerId なら名前だけ更新して返るので、専用の mutation は要らない。
  const [nameDraft, setNameDraft] = useState("");
  useEffect(() => {
    if (me) setNameDraft(me.name);
  }, [me?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitName = () => {
    const next = nameDraft.trim();
    if (!next || next === me?.name) return;
    persistName(next);
    void joinRoom({ code, playerId, name: next });
  };

  const teamCount = (color: string) => players.filter((p) => p.color === color).length;

  const handleStart = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await startGame({ roomId: room._id, playerId });
      if (!res.ok) {
        setStartError(
          res.reason === "notEnoughPlayers"
            ? "2人以上で開始できます"
            : "今は開始できません",
        );
      }
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 px-4 py-8">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-neutral-400">部屋コード</p>
        <p className="text-6xl font-black tracking-[0.2em] text-white">{code}</p>
        {joinUrl && <JoinQr url={joinUrl} />}
      </div>

      <div className="w-full max-w-md">
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">
          参加者 ({players.length}/6)
        </h2>
        <ul className="flex flex-col gap-2">
          {players.map((p) => (
            <li
              key={p._id}
              className="flex items-center gap-3 rounded-lg bg-neutral-800 px-4 py-3"
            >
              <span
                className="h-6 w-6 flex-shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="flex-1 truncate text-lg text-white">{p.name}</span>
              {p.playerId === room.hostPlayerId && <span aria-label="ホスト">👑</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full max-w-md">
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">自分の名前</h2>
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value.slice(0, 20))}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          maxLength={20}
          placeholder="なまえを入力"
          className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="w-full max-w-md">
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">自分の色</h2>
        <div className="grid grid-cols-6 gap-3">
          {PALETTE.map((color) => {
            const count = teamCount(color);
            const isMine = me?.color === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => void changeColor({ roomId: room._id, playerId, color })}
                className={`no-tap relative aspect-square rounded-xl transition-transform active:scale-95 ${
                  isMine ? "ring-4 ring-white" : "ring-1 ring-white/20"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`色を選ぶ: ${color}`}
              >
                {count > 1 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs font-bold text-white ring-2 ring-neutral-900">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-md">
        {isHost ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleStart}
              disabled={players.length < MIN_PLAYERS || starting}
              className="no-tap w-full rounded-xl bg-emerald-500 py-4 text-xl font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              スタート
            </button>
            {players.length < MIN_PLAYERS && (
              <p className="text-sm text-neutral-400">2人以上で開始できます</p>
            )}
            {startError && <p className="text-sm text-red-400">{startError}</p>}
          </div>
        ) : (
          <p className="text-center text-neutral-400">ホストの開始を待っています…</p>
        )}
      </div>
    </div>
  );
}
