"use client";

import { useEffect, useState } from "react";
import type { Team } from "@/lib/types";
import { flagSrc } from "@/lib/countries";
import {
  countryDetailFromTla,
  FIFA_RANK_SNAPSHOT,
  WC_APPEARANCE_SNAPSHOT,
} from "@/lib/country-detail";

function FlagBox({ team }: { team: Team }) {
  const [err, setErr] = useState(false);
  const src = flagSrc(team.countryCode);
  // flag-icons 4x3 → 4:3 box + object-cover for uniform display without clipping or padding.
  const box =
    "grid h-14 w-[4.667rem] shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-line";
  if (!src || err) {
    return <span className={`${box} text-[2.4rem]`}>{team.flag}</span>;
  }
  return (
    <span className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${team.nameKo} 국기`}
        onError={() => setErr(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

function StatItem({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-canvas px-3.5 py-3">
      <p className="eyebrow text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold leading-snug text-ink">{value}</p>
      {note && <p className="mt-0.5 text-[0.65rem] font-medium text-muted">{note}</p>}
    </div>
  );
}

export default function CountryDetail({
  team,
  onClose,
}: {
  team: Team;
  onClose: () => void;
}) {
  const detail = countryDetailFromTla(team.countryCode);

  // Push a history state so the Android back button closes the popup (mirrors HighlightViewer)
  useEffect(() => {
    window.history.pushState({ cd: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const close = () => {
    if (window.history.state?.cd) window.history.back();
    else onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/55 dark:bg-black/70 sm:items-center sm:justify-center sm:p-6"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mt-auto flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-card text-ink [transform:translateZ(0)] [backface-visibility:hidden] sm:mt-0 sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-center gap-3">
            <FlagBox team={team} />
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold leading-tight">{team.nameKo}</p>
              <p className="truncate text-xs font-medium text-muted">{team.nameEn}</p>
              {detail && (
                <span className="mt-1 inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-bold text-accent">
                  {detail.confederation}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={close}
            className="shrink-0 rounded-full px-3 py-1 text-sm font-bold text-muted hover:bg-canvas"
          >
            ✕ 닫기
          </button>
        </div>

        {/* Content (scrollable) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
          {detail ? (
            <div className="space-y-5">
              {/* World Cup */}
              <section>
                <p className="eyebrow pb-2 text-muted">🏆 월드컵</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatItem
                    label="FIFA 랭킹"
                    value={`${detail.fifaRank}위`}
                    note={FIFA_RANK_SNAPSHOT}
                  />
                  <StatItem
                    label="본선 출전"
                    value={`${detail.wcAppearances}회`}
                    note={WC_APPEARANCE_SNAPSHOT}
                  />
                  <StatItem label="최고 성적" value={detail.bestResult} />
                  <StatItem label="소속 연맹" value={detail.confederation} />
                </div>
              </section>

              {/* Country */}
              <section>
                <p className="eyebrow pb-2 text-muted">🌍 국가 정보</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatItem label="대륙" value={detail.continent} />
                  <StatItem label="수도" value={detail.capital} />
                  <StatItem label="인구" value={detail.population} />
                  <StatItem label="공용어" value={detail.languages} />
                </div>
              </section>
            </div>
          ) : (
            <p className="rounded-xl bg-canvas px-3 py-6 text-center text-sm text-muted">
              {team.nameKo} 상세 정보는 준비 중입니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
