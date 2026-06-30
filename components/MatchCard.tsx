"use client";

import { memo, useState } from "react";
import type { Match, Team } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/types";
import { kstTime } from "@/lib/format";
import { flagSrc } from "@/lib/countries";
import { venueFromName } from "@/lib/venues";

function FlagImg({ team }: { team: Team }) {
  const [err, setErr] = useState(false);
  const src = flagSrc(team.countryCode);
  // flag-icons 4x3 normalizes every flag to exactly 4:3 → 4:3 box + object-cover for uniform display.
  const box =
    "grid h-12 w-16 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-line transition duration-200 group-hover:ring-2 group-hover:ring-accent";
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

// Venue caption shown under the score row: small host-country flag + "도시 · 경기장".
// Falls back to the raw venue string with a pin when the stadium isn't in our 2026 catalogue.
function VenueLine({ venue }: { venue: string }) {
  const info = venueFromName(venue);
  if (!info) {
    return (
      <div className="mt-2.5 text-center text-[0.7rem] font-medium text-muted">📍 {venue}</div>
    );
  }
  const src = flagSrc(info.countryCode);
  return (
    <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[0.7rem] font-medium text-muted">
      {src && (
        <span className="grid h-3 w-4 shrink-0 place-items-center overflow-hidden rounded-[2px] ring-1 ring-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
        </span>
      )}
      <span className="truncate">
        {info.cityKo} · {info.stadiumKo}
      </span>
    </div>
  );
}

function MatchCard({
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
  onReveal: (id: string) => void;
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
  const hp = match.homePen;
  const ap = match.awayPen;
  const hasScore = played && hs != null && as != null;
  // Penalty shootout: main score is the (level) draw after extra time, hp/ap the shootout.
  const hasPen = hasScore && hp != null && ap != null;
  const showScore = hasScore && (!hideSpoilers || revealed);
  // Reveal the shootout parens only once the score is shown — a blurred `1 (3):(4) 1` is
  // visibly wider than `1 : 1`, which would leak that the match went to penalties.
  const showPen = hasPen && showScore;
  // Dim the loser. When decided on penalties the main score is level, so judge by the shootout.
  const homeColor = hasScore && (hasPen ? hp! < ap! : hs! < as!) ? "text-muted" : "text-ink";
  const awayColor = hasScore && (hasPen ? ap! < hp! : as! < hs!) ? "text-muted" : "text-ink";

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
            className="group rounded-lg transition-transform duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                {showPen && (
                  <span className={`ml-1 align-middle text-[0.6em] ${homeColor}`}>({hp})</span>
                )}
                <span className={`text-muted ${showPen ? "mx-0.5" : "mx-1.5"}`}>:</span>
                {showPen && (
                  <span className={`mr-1 align-middle text-[0.6em] ${awayColor}`}>({ap})</span>
                )}
                <span className={awayColor}>{as}</span>
              </div>
              {!showScore && (
                <button
                  onClick={() => onReveal(match.id)}
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
            className="group rounded-lg transition-transform duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <FlagImg team={match.away} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenCountry(match.home)}
          className={`${nameCls} underline decoration-dotted decoration-muted/30 underline-offset-[3px] transition-colors duration-150 hover:text-accent hover:decoration-accent focus-visible:text-accent focus-visible:outline-none active:text-accent`}
        >
          {match.home.nameKo}
        </button>
        <span className="text-center text-[0.6rem] font-bold text-muted">
          {hasScore ? "" : "KST"}
        </span>
        <button
          type="button"
          onClick={() => onOpenCountry(match.away)}
          className={`${nameCls} underline decoration-dotted decoration-muted/30 underline-offset-[3px] transition-colors duration-150 hover:text-accent hover:decoration-accent focus-visible:text-accent focus-visible:outline-none active:text-accent`}
        >
          {match.away.nameKo}
        </button>
      </div>

      {match.venue && <VenueLine venue={match.venue} />}

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

// Memoized so a parent re-render (spoiler toggle, scroll-driven active date)
// only re-renders cards whose own props actually changed, not all ~104 cards.
export default memo(MatchCard);
