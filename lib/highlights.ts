// 하이라이트 연결 우선순위 로직
// 우선순위: 임베드 가능 youtube → 직링크 youtube → 치지직(임베드)
// 치지직은 iframe 헤더 차단(X-Frame-Options/CSP)이 없어 모달 내 임베드를 시도하되,
// 임베드 실패에 대비해 뷰어에 외부 링크 폴백을 항상 노출한다.

import type { Highlight, HighlightSource } from "./types";

export function sortHighlights(hls: Highlight[]): Highlight[] {
  const rank = (h: Highlight) => {
    if (h.source === "youtube" && h.embeddable) return 0;
    if (h.source === "youtube") return 1;
    return 2; // chzzk
  };
  return [...hls].sort((a, b) => rank(a) - rank(b));
}

// 모달 내 iframe 으로 재생 시도할 수 있는가.
// youtube 는 DB embeddable 플래그를 따르고, 치지직은 videoId 만 있으면 항상 시도한다.
export function canEmbed(h: Highlight): boolean {
  if (!h.videoId) return false;
  if (h.source === "chzzk") return true;
  return h.source === "youtube" && h.embeddable;
}

// 모달용 iframe src (임베드 불가면 null)
export function embedUrlFor(h: Highlight): string | null {
  if (!h.videoId) return null;
  if (h.source === "youtube") return youtubeEmbedUrl(h.videoId);
  if (h.source === "chzzk") return chzzkEmbedUrl(h.videoId);
  return null;
}

// 인앱 모달로 바로 재생할 수 있는 대표 하이라이트 (우선순위 순, 없으면 null)
export function primaryEmbeddable(hls: Highlight[]): Highlight | null {
  return sortHighlights(hls).find(canEmbed) ?? null;
}

export function youtubeEmbedUrl(videoId: string): string {
  // enablejsapi=1: iframe Player API onError(101/150) 폴백을 위해
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&playsinline=1`;
}

export function chzzkEmbedUrl(videoId: string): string {
  // 치지직 VOD 임베드 플레이어. clip 은 경로가 달라 임베드 실패 시 폴백 링크로 처리.
  return `https://chzzk.naver.com/embed/video/${videoId}`;
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
