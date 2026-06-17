// Highlight link priority logic
// Priority: embeddable YouTube → direct-link YouTube → Chzzk (external link)
// Chzzk blocks external embedding (iframe shows "channel does not exist"), so in-modal playback is unavailable →
// handled as external link only; matches with Chzzk-only highlights display an explanatory message in the viewer.

import type { Highlight, HighlightSource } from "./types";

export function sortHighlights(hls: Highlight[]): Highlight[] {
  const rank = (h: Highlight) => {
    if (h.source === "youtube" && h.embeddable) return 0;
    if (h.source === "youtube") return 1;
    return 2; // chzzk
  };
  return [...hls].sort((a, b) => rank(a) - rank(b));
}

// Whether the highlight can play in the modal iframe. Chzzk blocks external embedding — YouTube embeds only.
export function canEmbed(h: Highlight): boolean {
  return h.source === "youtube" && h.embeddable && !!h.videoId;
}

// iframe src for the modal player (null when embedding is unavailable)
export function embedUrlFor(h: Highlight): string | null {
  if (h.source === "youtube" && h.videoId) return youtubeEmbedUrl(h.videoId);
  return null;
}

// Whether all highlights for this match are Chzzk-only (external embedding blocked — modal playback unavailable).
export function isChzzkOnly(hls: Highlight[]): boolean {
  return hls.length > 0 && hls.every((h) => h.source === "chzzk");
}

// The top embeddable highlight that can play directly in the in-app modal (priority order, null if none).
export function primaryEmbeddable(hls: Highlight[]): Highlight | null {
  return sortHighlights(hls).find(canEmbed) ?? null;
}

export function youtubeEmbedUrl(videoId: string): string {
  // enablejsapi=1: needed for iframe Player API onError(101/150) fallback handling
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&playsinline=1`;
}

// For admin manual-add: parse a URL into { source, videoId }
export function parseVideoUrl(
  url: string
): { source: HighlightSource; videoId: string } | null {
  const u = url.trim();
  // Chzzk
  const chzzk = u.match(/chzzk\.naver\.com\/(?:video|clips?)\/([\w-]+)/i);
  if (chzzk) return { source: "chzzk", videoId: chzzk[1] };
  // YouTube (watch?v= / youtu.be/ / embed/ / shorts/)
  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
  );
  if (yt) return { source: "youtube", videoId: yt[1] };
  return null;
}
