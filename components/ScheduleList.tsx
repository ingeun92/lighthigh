"use client";

import { useEffect, useRef, useState } from "react";
import type { Match } from "@/lib/types";
import { groupByKstDate, nearestGroupKey, kstChip, kstDateKey } from "@/lib/format";
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
  const todayKey = kstDateKey(nowIso);
  const tomorrowKey = kstDateKey(new Date(+new Date(nowIso) + 86400000).toISOString());

  const [active, setActive] = useState<Match | null>(null);
  const [activeKey, setActiveKey] = useState<string>(() => nearestGroupKey(groups, nowIso) ?? "");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // 진입 시 오늘/가장 가까운 경기로 스크롤
  useEffect(() => {
    const key = nearestGroupKey(groups, nowIso);
    if (key && sectionRefs.current[key]) {
      sectionRefs.current[key]!.scrollIntoView({ block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 스크롤에 따라 활성 날짜 탭 추적
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const key = visible?.target.getAttribute("data-key");
        if (key) {
          setActiveKey(key);
          tabRefs.current[key]?.scrollIntoView({ inline: "center", block: "nearest" });
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jump = (key: string) =>
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const chipText = (key: string, iso: string) =>
    key === todayKey ? "오늘" : key === tomorrowKey ? "내일" : kstChip(iso);

  return (
    <>
      {/* 날짜 칩 — 점등된 활성 탭 */}
      <nav className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto border-b border-line bg-pitch/90 px-4 py-2.5 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => {
          const on = g.key === activeKey;
          return (
            <button
              key={g.key}
              ref={(el) => {
                tabRefs.current[g.key] = el;
              }}
              onClick={() => jump(g.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                on ? "bg-flood text-pitch" : "bg-stand text-fog"
              }`}
            >
              {chipText(g.key, g.matches[0].kickoffUtc)}
            </button>
          );
        })}
      </nav>

      <div className="space-y-7 pt-5">
        {groups.map((g) => (
          <section
            key={g.key}
            data-key={g.key}
            ref={(el) => {
              sectionRefs.current[g.key] = el;
            }}
            className="scroll-mt-20"
          >
            <h2 className="mb-2.5 flex items-baseline gap-2 px-0.5">
              <span className="text-sm font-bold text-chalk">{g.label}</span>
              <span className="text-xs text-fog">{g.matches.length}경기</span>
            </h2>
            <div className="space-y-2.5">
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
