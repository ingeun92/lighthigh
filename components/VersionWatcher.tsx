"use client";

import { useEffect } from "react";

// The build id baked into this tab's JS at build time.
const LOADED = process.env.NEXT_PUBLIC_BUILD_ID;

// Auto-reloads a stale tab when a newer version has been deployed.
//
// Mobile users often keep the tab open for days, so newly shipped client features
// never appear until a full document reload. This polls /api/version whenever the
// tab is brought back to the foreground (the natural, least-disruptive moment) and
// reloads if the deployed build id differs from the one this tab is running.
export default function VersionWatcher() {
  useEffect(() => {
    // Skip when there's no real build id (local dev) — nothing to compare against.
    if (!LOADED || LOADED === "dev") return;

    let busy = false;
    let lastCheck = 0;

    const check = async () => {
      if (busy || document.visibilityState !== "visible") return;
      // Throttle so rapid focus/visibility events don't spam the endpoint.
      if (Date.now() - lastCheck < 10_000) return;
      lastCheck = Date.now();
      busy = true;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { v } = await res.json();
        if (v && v !== LOADED) window.location.reload();
      } catch {
        // Offline or transient error — just try again on the next foreground.
      } finally {
        busy = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check); // bfcache restore (iOS Safari)
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
    };
  }, []);

  return null;
}
