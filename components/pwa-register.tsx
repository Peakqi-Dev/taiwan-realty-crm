"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once on mount. Drop this into any layout
 * (we mount it in the root layout so PWA install works from any entry).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[PWA] service worker registration failed:", err);
        });
    };

    // Defer until idle so it doesn't compete with first paint.
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void) => void;
      setTimeout: typeof setTimeout;
    };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(register);
    } else {
      w.setTimeout(register, 1000);
    }
  }, []);

  return null;
}
