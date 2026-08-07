"use client";

import { useEffect, useState } from "react";

/**
 * Returns the current time (ms epoch), refreshed every `intervalMs` via
 * setInterval. SSR-safe: starts at 0 on the server / first render and picks
 * up the real clock once mounted in the browser, so timestamps derived from
 * it (countdowns, remaining time) never mismatch during hydration.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
