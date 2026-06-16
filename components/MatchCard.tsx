"use client";

import type { Match } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/types";
import { kstTime } from "@/lib/format";

function TeamRow({
  flag,
  name,
  score,
  tone,
}: {
  flag: string;
  name: string;
  score?: number;
  tone: "win" | "lose" | "even" | "none";
}) {
  const scoreColor =
    tone === "win" ? "text-chalk" : tone === "lose" ? "text-fog" : "text-chalk";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="text-[1.35rem] leading-none">{flag}</span>
        <span
          className={`truncate text-[0.95rem] ${
            tone === "lose" ? "font-medium text-fog" : "font-semibold text-chalk"
          }`}
        >
          {name}
        </span>
      </span>
      {tone !== "none" && (
        <span className={`scoreline text-2xl ${scoreColor}`}>{score ?? 0}</span>
      )}
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

  const tone = (a?: number, b?: number): "win" | "lose" | "even" | "none" => {
    if (!played || a == null || b == null) return "none";
    if (a === b) return "even";
    return a > b ? "win" : "lose";
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-stand">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow text-fog">
            {round}
            {match.groupLabel ? ` · ${match.groupLabel}` : ""}
          </span>
          {isLive ? (
            <span className="flex items-center gap-1.5 text-[0.7rem] font-bold text-live">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-live" />
              LIVE
            </span>
          ) : isFinished ? (
            <span className="text-[0.7rem] font-semibold text-fog">종료</span>
          ) : (
            <span className="scoreline text-sm text-chalk">
              {kstTime(match.kickoffUtc)}
              <span className="ml-1 text-[0.65rem] font-medium text-fog">KST</span>
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          <TeamRow
            flag={match.home.flag}
            name={match.home.nameKo}
            score={match.homeScore}
            tone={tone(match.homeScore, match.awayScore)}
          />
          <TeamRow
            flag={match.away.flag}
            name={match.away.nameKo}
            score={match.awayScore}
            tone={tone(match.awayScore, match.homeScore)}
          />
        </div>
      </div>

      {isFinished &&
        (hasHighlights ? (
          <button
            onClick={() => onOpenHighlights(match)}
            className="lit flex w-full items-center justify-center gap-2 bg-flood py-3 text-sm font-bold text-pitch transition-transform active:scale-[0.99]"
          >
            <span aria-hidden>▸</span> 하이라이트 보기
            <span className="rounded-full bg-pitch/15 px-1.5 py-0.5 text-[0.7rem] font-bold tabular-nums">
              {match.highlights.length}
            </span>
          </button>
        ) : (
          <div className="border-t border-line py-2.5 text-center text-xs font-medium text-fog">
            하이라이트 준비 중
          </div>
        ))}
    </div>
  );
}
