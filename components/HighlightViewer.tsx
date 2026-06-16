"use client";

import { useEffect } from "react";
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
    if (window.history.state?.hv) window.history.back();
    else onClose();
  };

  const sorted = sortHighlights(match.highlights);
  const embed = primaryEmbeddable(match.highlights);
  const others = sorted.filter((h) => h.id !== embed?.id);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card-soft mt-auto max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-ink sm:mx-auto sm:mt-0 sm:max-w-2xl sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm font-bold sm:text-base">
            <FlagMini team={match.home} />
            <span className="truncate">{match.home.nameKo}</span>
            <span className="scoreline shrink-0 text-base text-accent sm:text-lg">
              {match.homeScore} : {match.awayScore}
            </span>
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

        {embed && embed.videoId ? (
          <div className="space-y-2">
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
          <p className="mb-3 rounded-xl bg-canvas px-3 py-4 text-center text-sm text-muted">
            이 경기 하이라이트는 외부에서 열립니다.
          </p>
        )}

        {others.length > 0 && (
          <div className="mt-4 space-y-2">
            {embed && <p className="eyebrow text-muted">다른 하이라이트</p>}
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
        )}
      </div>
    </div>
  );
}
