"use client";

import { useEffect, useState } from "react";
import type { Match, Highlight, Team } from "@/lib/types";
import { sortHighlights, primaryEmbeddable, youtubeEmbedUrl } from "@/lib/highlights";
import { flagSrc } from "@/lib/countries";

const sourceLabel = (h: Highlight) =>
  h.source === "youtube" ? `YouTube${h.channel ? " · " + h.channel : ""}` : "치지직";

function FlagMini({ team }: { team: Team }) {
  const src = flagSrc(team.countryCode);
  if (!src) return <span className="text-base">{team.flag}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${team.nameKo} 국기`}
      loading="lazy"
      className="h-5 w-[1.75rem] shrink-0 rounded object-cover shadow-sm ring-1 ring-line"
    />
  );
}

export default function HighlightViewer({
  match,
  hideScore,
  onClose,
}: {
  match: Match;
  hideScore: boolean;
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(!hideScore);

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
    if (window.history.state?.hv) window.history.back();
    else onClose();
  };

  const sorted = sortHighlights(match.highlights);
  const embed = primaryEmbeddable(match.highlights);
  const others = sorted.filter((h) => h.id !== embed?.id);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/55 sm:items-center sm:justify-center sm:p-6"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mt-auto flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-card text-ink sm:mt-0 sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
          <p className="flex min-w-0 items-center gap-2 text-sm font-bold sm:text-base">
            <FlagMini team={match.home} />
            <span className="truncate">{match.home.nameKo}</span>
            {revealed ? (
              <span className="scoreline shrink-0 text-base text-accent sm:text-lg">
                {match.homeScore} : {match.awayScore}
              </span>
            ) : (
              <button
                onClick={() => setRevealed(true)}
                className="shrink-0 whitespace-nowrap rounded-full bg-ink/80 px-2.5 py-1 text-[0.65rem] font-bold text-white"
              >
                결과 보기
              </button>
            )}
            <span className="truncate">{match.away.nameKo}</span>
            <FlagMini team={match.away} />
          </p>
          <button
            onClick={close}
            className="shrink-0 rounded-full px-3 py-1 text-sm font-bold text-muted hover:bg-canvas"
          >
            ✕ 닫기
          </button>
        </div>

        {/* 본문 (스크롤) */}
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-6">
          {embed && embed.videoId ? (
            <div className="shrink-0 space-y-2">
              <div className="aspect-video w-full overflow-hidden rounded-2xl bg-ink">
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
                className="block text-center text-xs font-bold text-accent underline"
              >
                재생이 안 되면 YouTube 에서 열기 ↗
              </a>
            </div>
          ) : (
            <p className="shrink-0 rounded-xl bg-canvas px-3 py-4 text-center text-sm text-muted">
              이 경기 하이라이트는 외부에서 열립니다.
            </p>
          )}

          {others.length > 0 && (
            <div className="mt-4 flex min-h-0 flex-1 flex-col">
              {embed && (
                <p className="eyebrow shrink-0 pb-2 text-muted">다른 하이라이트 {others.length}</p>
              )}
              <div className="-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {others.map((h) => (
                  <a
                    key={h.id}
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-line bg-canvas px-4 py-3 text-sm hover:border-accent/40"
                  >
                    <span className="truncate font-medium text-ink">{h.title ?? sourceLabel(h)}</span>
                    <span className="ml-2 shrink-0 font-bold text-muted">{sourceLabel(h)} ↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
