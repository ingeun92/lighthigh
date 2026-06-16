"use client";

import { useState } from "react";
import type { Match, Team } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/types";
import { kstTime } from "@/lib/format";
import { flagSrc } from "@/lib/countries";

function FlagImg({ team }: { team: Team }) {
  const [err, setErr] = useState(false);
  const src = flagSrc(team.countryCode);
  if (!src || err) {
    return <span className="grid h-11 w-[3.75rem] place-items-center text-[2rem]">{team.flag}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${team.nameKo} 국기`}
      onError={() => setErr(true)}
      loading="lazy"
      className="h-11 w-[3.75rem] rounded-lg object-cover shadow-sm ring-1 ring-line"
    />
  );
}

function TeamCol({ team }: { team: Team }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <FlagImg team={team} />
      <span className="break-keep text-center text-[0.82rem] font-bold leading-tight text-ink">
        {team.nameKo}
      </span>
    </div>
  );
}

export default function MatchCard({
  match,
  onOpenHighlights,
}: {
  match: Match;
  onOpenHighlights: (m: Match) => void;
}) {
  const round = STAGE_LABEL[match.stage] ?? match.stage;
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const played = isFinished || isLive;
  const hasHighlights = isFinished && match.highlights.length > 0;

  const hs = match.homeScore;
  const as = match.awayScore;
  const homeColor = played && hs != null && as != null && hs < as ? "text-muted" : "text-ink";
  const awayColor = played && hs != null && as != null && as < hs ? "text-muted" : "text-ink";

  return (
    <div className="card-soft rounded-2xl border border-line bg-card p-4">
      <div className="mb-1 flex items-center justify-between">
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

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1">
        <TeamCol team={match.home} />

        <div className="px-1 text-center">
          {played && hs != null && as != null ? (
            <div className="scoreline text-[1.9rem] leading-none">
              <span className={homeColor}>{hs}</span>
              <span className="mx-1.5 text-muted">:</span>
              <span className={awayColor}>{as}</span>
            </div>
          ) : (
            <div>
              <div className="scoreline text-lg leading-none text-ink">
                {kstTime(match.kickoffUtc)}
              </div>
              <div className="mt-1 text-[0.6rem] font-bold text-muted">KST</div>
            </div>
          )}
        </div>

        <TeamCol team={match.away} />
      </div>

      {isFinished &&
        (hasHighlights ? (
          <button
            onClick={() => onOpenHighlights(match)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-flame py-3 text-sm font-extrabold text-white transition-transform active:scale-[0.99]"
          >
            <span aria-hidden>▸</span> 하이라이트 보기
            <span className="scoreline rounded-full bg-white/25 px-1.5 py-0.5 text-[0.7rem]">
              {match.highlights.length}
            </span>
          </button>
        ) : (
          <div className="mt-3 border-t border-line pt-2.5 text-center text-xs font-bold text-muted">
            하이라이트 준비 중
          </div>
        ))}
    </div>
  );
}
