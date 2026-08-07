"use client";

import { useEffect, useState } from "react";

/**
 * Returns `window.location.origin`, or "" until mounted.
 *
 * Reading `typeof window` directly during render would make the first client
 * render differ from the server-rendered HTML and trip a hydration mismatch,
 * so the origin is picked up in an effect instead.
 */
export function useOrigin(): string {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return origin;
}
