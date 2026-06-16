// 하이라이트 연결 우선순위 로직
// 우선순위: 임베드 가능 youtube → 직링크 youtube → 치지직 딥링크

import type { Highlight, HighlightSource } from "./types";

export function sortHighlights(hls: Highlight[]): Highlight[] {
  const rank = (h: Highlight) => {
    if (h.source === "youtube" && h.embeddable) return 0;
    if (h.source === "youtube") return 1;
    return 2; // chzzk
  };
  return [...hls].sort((a, b) => rank(a) - rank(b));
}

// 인앱 모달로 바로 재생할 수 있는 하이라이트 (없으면 null)
export function primaryEmbeddable(hls: Highlight[]): Highlight | null {
  return hls.find((h) => h.source === "youtube" && h.embeddable) ?? null;
}

export function youtubeEmbedUrl(videoId: string): string {
  // enablejsapi=1: iframe Player API onError(101/150) 폴백을 위해
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&playsinline=1`;
}

// 관리자 수동 추가용: URL → { source, videoId } 파싱
export function parseVideoUrl(
  url: string
): { source: HighlightSource; videoId: string } | null {
  const u = url.trim();
  // 치지직
  const chzzk = u.match(/chzzk\.naver\.com\/(?:video|clips?)\/([\w-]+)/i);
  if (chzzk) return { source: "chzzk", videoId: chzzk[1] };
  // 유튜브 (watch?v= / youtu.be/ / embed/ / shorts/)
  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
  );
  if (yt) return { source: "youtube", videoId: yt[1] };
  return null;
}
