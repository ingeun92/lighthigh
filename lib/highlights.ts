// 하이라이트 연결 우선순위 로직
// 우선순위: 임베드 가능 youtube → 직링크 youtube → 치지직(외부 링크)
// 치지직은 외부 임베드를 차단해(iframe 시 "존재하지 않는 채널") 모달 재생이 불가 →
// 외부 링크로만 처리하고, 치지직만 있는 경기는 뷰어에서 그 사유를 안내한다.

import type { Highlight, HighlightSource } from "./types";

export function sortHighlights(hls: Highlight[]): Highlight[] {
  const rank = (h: Highlight) => {
    if (h.source === "youtube" && h.embeddable) return 0;
    if (h.source === "youtube") return 1;
    return 2; // chzzk
  };
  return [...hls].sort((a, b) => rank(a) - rank(b));
}

// 모달 내 iframe 으로 재생할 수 있는가. 치지직은 외부 임베드 차단이라 불가 — youtube 임베드만.
export function canEmbed(h: Highlight): boolean {
  return h.source === "youtube" && h.embeddable && !!h.videoId;
}

// 모달용 iframe src (임베드 불가면 null)
export function embedUrlFor(h: Highlight): string | null {
  if (h.source === "youtube" && h.videoId) return youtubeEmbedUrl(h.videoId);
  return null;
}

// 이 경기 하이라이트가 전부 치지직(외부 임베드 차단)이라 모달 재생이 불가한가.
export function isChzzkOnly(hls: Highlight[]): boolean {
  return hls.length > 0 && hls.every((h) => h.source === "chzzk");
}

// 인앱 모달로 바로 재생할 수 있는 대표 하이라이트 (우선순위 순, 없으면 null)
export function primaryEmbeddable(hls: Highlight[]): Highlight | null {
  return sortHighlights(hls).find(canEmbed) ?? null;
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
