"use client";

import type { Match } from "@/lib/types";
import { STAGE_LABEL, STATUS_LABEL } from "@/lib/types";
import { kstTime } from "@/lib/format";

const statusStyle: Record<string, string> = {
  finished: "bg-neutral-200 text-neutral-600",
  live: "bg-red-100 text-red-600",
  scheduled: "bg-blue-50 text-blue-600",
  postponed: "bg-amber-100 text-amber-700",
};

function TeamRow({ flag, name, score }: { flag: string; name: string; score?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-base">
        <span className="text-xl leading-none">{flag}</span>
        <span className="font-medium">{name}</span>
      </span>
      <span className="text-lg font-bold tabular-nums">{score ?? "-"}</span>
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
  const hasHighlights = match.status === "finished" && match.highlights.length > 0;
  const isFinished = match.status === "finished";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
        <span>
          {round}
          {match.groupLabel ? ` · ${match.groupLabel}` : ""}
        </span>
        <span className={`rounded-full px-2 py-0.5 font-medium ${statusStyle[match.status]}`}>
          {match.status === "scheduled"
            ? `${kstTime(match.kickoffUtc)} KST`
            : STATUS_LABEL[match.status]}
        </span>
      </div>

      <div className="space-y-1.5">
        <TeamRow flag={match.home.flag} name={match.home.nameKo} score={isFinished || match.status === "live" ? match.homeScore : undefined} />
        <TeamRow flag={match.away.flag} name={match.away.nameKo} score={isFinished || match.status === "live" ? match.awayScore : undefined} />
      </div>

      {isFinished && (
        <>
          <div className="my-3 h-px bg-neutral-100" />
          <button
            disabled={!hasHighlights}
            onClick={() => hasHighlights && onOpenHighlights(match)}
            className={
              hasHighlights
                ? "w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white active:scale-[0.99]"
                : "w-full rounded-xl bg-neutral-100 py-2.5 text-sm font-medium text-neutral-400"
            }
          >
            {hasHighlights ? "▶ 하이라이트 보기" : "하이라이트 준비 중"}
          </button>
        </>
      )}
    </div>
  );
}
