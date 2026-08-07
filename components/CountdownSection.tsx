"use client";

import { useNow } from "@/lib/useNow";

interface CountdownSectionProps {
  /** Epoch ms when "playing" begins (room.startsAt). */
  startsAt: number;
}

/** Derives 3 / 2 / 1 from `startsAt` on the client (設計メモ D10) — no server polling. */
export default function CountdownSection({ startsAt }: CountdownSectionProps) {
  const now = useNow(100);
  const msLeft = now > 0 ? startsAt - now : null;
  const count = msLeft === null ? 3 : Math.max(1, Math.ceil(msLeft / 1000));

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-6">
      <p className="text-lg text-neutral-400">まもなく開始</p>
      <div
        key={count}
        className="animate-countdown-pop text-[10rem] font-black leading-none text-white"
      >
        {count}
      </div>
    </div>
  );
}
