"use client";

import { useState } from "react";
import type { Match, Team } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/types";
import { kstTime } from "@/lib/format";
import { flagSrc } from "@/lib/countries";

function FlagImg({ team }: { team: Team }) {
  const [err, setErr] = useState(false);
  const src = flagSrc(team.countryCode);
  // flag-icons 4x3 normalizes every flag to exactly 4:3 → 4:3 box + object-cover for uniform display.
  const box = "grid h-12 w-16 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-line";
  if (!src || err) {
    return <span className={`${box} text-[2rem]`}>{team.flag}</span>;
  }
  return (
    <span className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${team.nameKo} 국기`}
        onError={() => setErr(true)}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export default function MatchCard({
  match,
  hideSpoilers,
  revealed,
  onReveal,
  onOpenHighlights,
  onOpenCountry,
}: {
  match: Match;
  hideSpoilers: boolean;
  revealed: boolean;
  onReveal: () => void;
  onOpenHighlights: (m: Match) => void;
  onOpenCountry: (team: Team) => void;
}) {
  const round = STAGE_LABEL[match.stage] ?? match.stage;
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const played = isFinished || isLive;
  const hasHighlights = isFinished && match.highlights.length > 0;

  const hs = match.homeScore;
  const as = match.awayScore;
  const hasScore = played && hs != null && as != null;
  const showScore = hasScore && (!hideSpoilers || revealed);
  const homeColor = hasScore && hs! < as! ? "text-muted" : "text-ink";
  const awayColor = hasScore && as! < hs! ? "text-muted" : "text-ink";

  const nameCls = "break-keep text-center text-[0.82rem] font-bold leading-tight text-ink";

  return (
    <div className="card-soft rounded-2xl border border-line bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow text-muted">
          {round}
          {match.groupLabel ? ` · ${match.groupLabel}` : ""}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-[0.7rem] font-extrabold text-live">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-live" />
            LIVE
          </span>
        ) : isFinished ? (
          <span className="text-[0.7rem] font-bold text-muted">종료</span>
        ) : (
          <span className="text-[0.7rem] font-bold text-muted">예정</span>
        )}
      </div>

      {/* Row 1: flags · score / Row 2: country names — vertically aligned */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2 py-0.5">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onOpenCountry(match.home)}
            aria-label={`${match.home.nameKo} 정보 보기`}
            className="rounded-lg transition-transform active:scale-95"
          >
            <FlagImg team={match.home} />
          </button>
        </div>
        <div className="relative px-1 text-center">
          {hasScore ? (
            <>
              <div
                className={`scoreline text-[1.9rem] leading-none ${
                  showScore ? "" : "select-none blur-[7px]"
                }`}
                aria-hidden={!showScore}
              >
                <span className={homeColor}>{hs}</span>
                <span className="mx-1.5 text-muted">:</span>
                <span className={awayColor}>{as}</span>
              </div>
              {!showScore && (
                <button
                  onClick={onReveal}
                  aria-label="결과 보기"
                  className="absolute inset-0 grid place-items-center"
                >
                  <span className="whitespace-nowrap rounded-full bg-ink/80 dark:bg-black/60 px-2.5 py-1 text-[0.6rem] font-bold text-white">
                    결과 보기
                  </span>
                </button>
              )}
            </>
          ) : (
            <div className="scoreline text-lg leading-none text-ink">{kstTime(match.kickoffUtc)}</div>
          )}
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onOpenCountry(match.away)}
            aria-label={`${match.away.nameKo} 정보 보기`}
            className="rounded-lg transition-transform active:scale-95"
          >
            <FlagImg team={match.away} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenCountry(match.home)}
          className={`${nameCls} underline-offset-2 active:underline`}
        >
          {match.home.nameKo}
        </button>
        <span className="text-center text-[0.6rem] font-bold text-muted">
          {hasScore ? "" : "KST"}
        </span>
        <button
          type="button"
          onClick={() => onOpenCountry(match.away)}
          className={`${nameCls} underline-offset-2 active:underline`}
        >
          {match.away.nameKo}
        </button>
      </div>

      {isLive && match.liveUrl && (
        <a
          href={match.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-live py-3 text-sm font-extrabold text-white transition-transform active:scale-[0.99]"
        >
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
          라이브 보기
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-[0.7rem]">치지직 ↗</span>
        </a>
      )}

      {isFinished &&
        (hasHighlights ? (
          <button
            onClick={() => onOpenHighlights(match)}
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-extrabold text-white transition-transform active:scale-[0.99]"
          >
            <span aria-hidden>▸</span> 하이라이트 보기
            <span className="scoreline rounded-full bg-white/25 px-1.5 py-0.5 text-[0.7rem]">
              {match.highlights.length}
            </span>
          </button>
        ) : (
          <div className="mt-3.5 border-t border-line pt-2.5 text-center text-xs font-bold text-muted">
            하이라이트 준비 중
          </div>
        ))}
    </div>
  );
}
