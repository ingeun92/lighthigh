"use client";

import { useEffect, useRef, useState } from "react";
import type { Match } from "@/lib/types";
import { groupByKstDate, nearestGroupKey } from "@/lib/format";
import MatchCard from "./MatchCard";
import HighlightViewer from "./HighlightViewer";

export default function ScheduleList({
  matches,
  nowIso,
}: {
  matches: Match[];
  nowIso: string;
}) {
  const groups = groupByKstDate(matches);
  const [active, setActive] = useState<Match | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // 진입 시 오늘/가장 가까운 경기로 스크롤
  useEffect(() => {
    const key = nearestGroupKey(groups, nowIso);
    if (key && sectionRefs.current[key]) {
      sectionRefs.current[key]!.scrollIntoView({ block: "start" });
    }
    // groups 는 매 렌더 새로 만들어지므로 의존성에서 제외 (최초 1회 의도)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jump = (key: string) =>
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      {/* 날짜 칩 네비 */}
      <nav className="sticky top-[52px] z-10 -mx-4 flex gap-2 overflow-x-auto border-b border-neutral-100 bg-white/90 px-4 py-2 backdrop-blur">
        {groups.map((g) => (
          <button
            key={g.key}
            onClick={() => jump(g.key)}
            className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 active:bg-neutral-200"
          >
            {g.label}
          </button>
        ))}
      </nav>

      <div className="space-y-6 py-4">
        {groups.map((g) => (
          <section
            key={g.key}
            ref={(el) => {
              sectionRefs.current[g.key] = el;
            }}
            className="scroll-mt-28"
          >
            <h2 className="mb-2 px-1 text-sm font-bold text-neutral-800">{g.label}</h2>
            <div className="space-y-3">
              {g.matches.map((m) => (
                <MatchCard key={m.id} match={m} onOpenHighlights={setActive} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {active && <HighlightViewer match={active} onClose={() => setActive(null)} />}
    </>
  );
}
