"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { teamName } from "@/lib/colors";

interface MyTeamBannerProps {
  players: Doc<"players">[];
  playerId: string;
}

/** プレイ中に自分の色(チーム)を見失わないよう常時表示するバナー。 */
export default function MyTeamBanner({ players, playerId }: MyTeamBannerProps) {
  const me = players.find((p) => p.playerId === playerId);
  if (!me) return null;

  const teammates = players.filter((p) => p.color === me.color);
  const teammateNames = teammates
    .map((p) => (p.playerId === playerId ? `${p.name}(あなた)` : p.name))
    .join("、");

  return (
    <div className="flex items-center gap-3 rounded-xl bg-neutral-800 px-4 py-3">
      <span
        className="h-10 w-10 flex-shrink-0 rounded-full ring-2 ring-white/60"
        style={{ backgroundColor: me.color }}
      />
      <div className="flex flex-col">
        <p className="text-lg font-bold text-white">
          あなたは<span style={{ color: me.color }}>{teamName(me.color)}</span>
        </p>
        <p className="text-sm text-neutral-400">
          {teammates.length > 1 ? teammateNames : "あなただけのチームです"}
        </p>
      </div>
    </div>
  );
}
