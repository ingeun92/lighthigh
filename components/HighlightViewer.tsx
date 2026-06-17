"use client";

import { useEffect } from "react";
import type { Match, HighlightSource, Team } from "@/lib/types";
import { sortHighlights, primaryEmbeddable, embedUrlFor, isChzzkOnly } from "@/lib/highlights";
import { flagSrc } from "@/lib/countries";

// 소스별 외부 링크 UX — 라벨·브랜드색(유튜브=레드, 치지직=그린)으로 어디로 열리는지 명확히.
const SOURCE_META: Record<HighlightSource, { label: string; open: string; chip: string; text: string }> = {
  youtube: { label: "YouTube", open: "YouTube에서 열기", chip: "bg-red-50 text-red-600", text: "text-red-600" },
  chzzk: { label: "치지직", open: "치지직 앱에서 열기", chip: "bg-emerald-50 text-emerald-600", text: "text-emerald-600" },
};

function FlagMini({ team }: { team: Team }) {
  const src = flagSrc(team.countryCode);
  // flag-icons 4x3 → 4:3 박스 + object-cover 로 잘림·여백 없이 균일.
  const box = "grid h-5 w-[1.667rem] shrink-0 place-items-center overflow-hidden rounded bg-white shadow-sm ring-1 ring-line";
  if (!src) return <span className={`${box} text-xs`}>{team.flag}</span>;
  return (
    <span className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${team.nameKo} 국기`}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export default function HighlightViewer({
  match,
  hideScore,
  revealed,
  onReveal,
  onClose,
}: {
  match: Match;
  hideScore: boolean;
  revealed: boolean;
  onReveal: () => void;
  onClose: () => void;
}) {
  const showScore = !hideScore || revealed;

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
  const embedSrc = embed ? embedUrlFor(embed) : null;
  const embedMeta = embed ? SOURCE_META[embed.source] : null;
  const chzzkOnly = isChzzkOnly(match.highlights);
  const others = sorted.filter((h) => h.id !== embed?.id);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/55 sm:items-center sm:justify-center sm:p-6"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mt-auto flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-card text-ink [transform:translateZ(0)] [backface-visibility:hidden] sm:mt-0 sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
          <p className="flex min-w-0 items-center gap-2 text-sm font-bold sm:text-base">
            <FlagMini team={match.home} />
            <span className="truncate">{match.home.nameKo}</span>
            {showScore ? (
              <span className="scoreline shrink-0 text-base text-accent sm:text-lg">
                {match.homeScore} : {match.awayScore}
              </span>
            ) : (
              <button
                onClick={onReveal}
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
          {embed && embedSrc && embedMeta ? (
            <div className="shrink-0 space-y-2">
              <div className="aspect-video w-full overflow-hidden rounded-2xl bg-ink">
                <iframe
                  className="h-full w-full"
                  src={embedSrc}
                  title={embed.title ?? "하이라이트"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              {/* 런타임 임베드 차단(유튜브 101/150, 치지직 미지원 등) 대비 소스별 폴백 링크 항상 노출 */}
              <a
                href={embed.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-center text-xs font-bold underline ${embedMeta.text}`}
              >
                재생이 안 되면 {embedMeta.open} ↗
              </a>
            </div>
          ) : chzzkOnly ? (
            <div className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-4 text-center">
              <p className="text-sm font-bold text-emerald-700">
                치지직 정책상 여기서 바로 재생할 수 없어요
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                아래 링크로 치지직 앱·웹에서 시청하세요
              </p>
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
                {others.map((h) => {
                  const meta = SOURCE_META[h.source];
                  return (
                    <a
                      key={h.id}
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-xl border border-line bg-canvas px-4 py-3 text-sm hover:border-accent/40"
                    >
                      <span className="min-w-0 truncate font-medium text-ink">
                        {h.title ?? `${meta.label}${h.channel ? " · " + h.channel : ""}`}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${meta.chip}`}
                      >
                        {meta.label}
                        <span aria-hidden>↗</span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
