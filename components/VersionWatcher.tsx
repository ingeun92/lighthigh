"use client";

import { useEffect } from "react";

// The build id baked into this tab's JS at build time.
const LOADED = process.env.NEXT_PUBLIC_BUILD_ID;

// A tab that's been backgrounded longer than this is treated as stale on return,
// so it reloads to pick up a fresh `nowIso` (today's date) and the latest data.
const STALE_AFTER_MS = 30 * 60_000; // 30 min

// Keeps a long-lived mobile tab fresh.
//
// Two stale-tab problems are handled when the tab returns to the foreground:
//   1. A newer build was deployed — detected by polling /api/version and
//      comparing build ids; client features otherwise never appear until reload.
//   2. The tab was restored from bfcache or sat in the background for a long
//      time — its `nowIso`/selected date are frozen at the old snapshot, so the
//      schedule can show yesterday's date until a full document reload.
export default function VersionWatcher() {
  useEffect(() => {
    let busy = false;
    let lastCheck = 0;
    let hiddenAt = 0;

    // True when a newer build has been deployed since this tab loaded.
    const isNewBuildDeployed = async () => {
      if (!LOADED || LOADED === "dev") return false;
      if (busy || Date.now() - lastCheck < 10_000) return false; // throttle
      lastCheck = Date.now();
      busy = true;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return false;
        const { v } = await res.json();
        return Boolean(v && v !== LOADED);
      } catch {
        // Offline or transient error — try again on the next foreground.
        return false;
      } finally {
        busy = false;
      }
    };

    const onForeground = async (e?: Event) => {
      if (document.visibilityState !== "visible") return;
      // bfcache restore (iOS Safari) or a long background stint → hard reload to
      // reset the frozen date/data snapshot.
      const restoredFromBfcache = (e as PageTransitionEvent | undefined)?.persisted === true;
      const wasAwayTooLong = hiddenAt > 0 && Date.now() - hiddenAt > STALE_AFTER_MS;
      if (restoredFromBfcache || wasAwayTooLong) {
        window.location.reload();
        return;
      }
      // Otherwise just check whether a newer build shipped.
      if (await isNewBuildDeployed()) window.location.reload();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else onForeground();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onForeground);
    window.addEventListener("pageshow", onForeground); // bfcache restore (iOS Safari)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onForeground);
      window.removeEventListener("pageshow", onForeground);
    };
  }, []);

  return null;
}
