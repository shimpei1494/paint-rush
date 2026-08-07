"use client";

import { useCallback, useEffect, useState } from "react";

const PLAYER_ID_KEY = "paintrush:playerId";
const NAME_KEY = "paintrush:name";

export interface PlayerIdentity {
  playerId: string | null;
  name: string;
  ready: boolean;
  setName: (name: string) => void;
}

/**
 * Reads/creates a stable `playerId` (crypto.randomUUID) and reads/writes a
 * display `name`, both persisted in localStorage. SSR-safe: the first render
 * (server + client pre-hydration) always returns `{ playerId: null, name: "",
 * ready: false }` so there is no hydration mismatch; the real values are
 * hydrated in an effect that only runs in the browser.
 */
export function usePlayerIdentity(): PlayerIdentity {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [name, setNameState] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    const storedName = localStorage.getItem(NAME_KEY) ?? "";
    setPlayerId(id);
    setNameState(storedName);
    setReady(true);
  }, []);

  const setName = useCallback((next: string) => {
    setNameState(next);
    localStorage.setItem(NAME_KEY, next);
  }, []);

  return { playerId, name, ready, setName };
}
