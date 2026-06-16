"use client";

import { useEffect } from "react";
import type { Match, Highlight } from "@/lib/types";
import { sortHighlights, primaryEmbeddable, youtubeEmbedUrl } from "@/lib/highlights";

const sourceLabel = (h: Highlight) =>
  h.source === "youtube" ? `YouTube${h.channel ? " · " + h.channel : ""}` : "치지직";

export default function HighlightViewer({
  match,
  onClose,
}: {
  match: Match;
  onClose: () => void;
}) {
  // 안드로이드 뒤로가기로 닫히도록 history state push
  useEffect(() => {
    window.history.pushState({ hv: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const close = () => {
    // pushState 한 항목을 되돌림 → popstate 핸들러가 onClose 호출
    if (window.history.state?.hv) window.history.back();
    else onClose();
  };

  const sorted = sortHighlights(match.highlights);
  const embed = primaryEmbeddable(match.highlights);
  const others = sorted.filter((h) => h.id !== embed?.id);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-pitch/85 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mt-auto w-full rounded-t-2xl border-t border-line bg-stand p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-chalk sm:mx-auto sm:my-auto sm:max-w-lg sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <span>{match.home.flag} {match.home.nameKo}</span>
            <span className="scoreline text-base text-flood">
              {match.homeScore}:{match.awayScore}
            </span>
            <span>{match.away.nameKo} {match.away.flag}</span>
          </p>
          <button onClick={close} className="rounded-full px-3 py-1 text-sm text-fog hover:bg-white/10">
            ✕ 닫기
          </button>
        </div>

        {embed && embed.videoId ? (
          <div className="space-y-2">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                className="h-full w-full"
                src={youtubeEmbedUrl(embed.videoId)}
                title={embed.title ?? "하이라이트"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            {/* 런타임 임베드 차단(101/150) 대비 폴백 링크 항상 노출 */}
            <a
              href={embed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-flood/80 underline"
            >
              재생이 안 되면 YouTube 에서 열기 ↗
            </a>
          </div>
        ) : (
          <p className="mb-3 rounded-lg bg-stand2 px-3 py-4 text-center text-sm text-fog">
            이 경기 하이라이트는 외부에서 열립니다.
          </p>
        )}

        {others.length > 0 && (
          <div className="mt-4 space-y-2">
            {embed && <p className="eyebrow text-fog">다른 하이라이트</p>}
            {others.map((h) => (
              <a
                key={h.id}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl bg-stand2 px-4 py-3 text-sm hover:brightness-125"
              >
                <span className="truncate text-chalk">{h.title ?? sourceLabel(h)}</span>
                <span className="ml-2 shrink-0 text-fog">{sourceLabel(h)} ↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
