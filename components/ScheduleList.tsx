"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Match } from "@/lib/types";
import {
  groupByKstDate,
  nearestGroupKey,
  kstDateKey,
  kstDay,
  kstWeekday,
  kstMonth,
} from "@/lib/format";
import MatchCard from "./MatchCard";
import HighlightViewer from "./HighlightViewer";

export default function ScheduleList({
  matches,
  nowIso,
}: {
  matches: Match[];
  nowIso: string;
}) {
  const groups = useMemo(() => groupByKstDate(matches), [matches]);
  const todayKey = kstDateKey(nowIso);

  const [active, setActive] = useState<Match | null>(null);
  const [activeKey, setActiveKey] = useState<string>(() => nearestGroupKey(groups, nowIso) ?? "");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // 진입 시 오늘/가장 가까운 경기로 스크롤
  useEffect(() => {
    const key = nearestGroupKey(groups, nowIso);
    if (key && sectionRefs.current[key]) sectionRefs.current[key]!.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 스크롤에 따라 활성 날짜 추적 + 활성 셀을 스트립 중앙으로
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const key = visible?.target.getAttribute("data-key");
        if (key) {
          setActiveKey(key);
          cellRefs.current[key]?.scrollIntoView({ inline: "center", block: "nearest" });
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jump = (key: string) =>
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const activeMonth = useMemo(() => {
    const g = groups.find((x) => x.key === activeKey) ?? groups[0];
    return g ? kstMonth(g.matches[0].kickoffUtc) : "";
  }, [groups, activeKey]);

  return (
    <>
      {/* 달력형 날짜 스트립 */}
      <div className="sticky top-0 z-20 -mx-5 bg-canvas/95 px-5 pb-2 pt-2 backdrop-blur">
        <p className="mb-1.5 text-xs font-bold text-muted">{activeMonth}</p>
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map((g) => {
              const on = g.key === activeKey;
              const isToday = g.key === todayKey;
              const hasHl = g.matches.some(
                (m) => m.status === "finished" && m.highlights.length > 0
              );
              return (
                <button
                  key={g.key}
                  ref={(el) => {
                    cellRefs.current[g.key] = el;
                  }}
                  onClick={() => jump(g.key)}
                  aria-pressed={on}
                  className={`flex w-[3.1rem] shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors ${
                    on
                      ? "border-flame bg-flame text-white"
                      : isToday
                        ? "border-flame/50 bg-card text-flame"
                        : "border-line bg-card text-ink"
                  }`}
                >
                  <span className={`text-[0.65rem] font-bold ${on ? "text-white/80" : "text-muted"}`}>
                    {kstWeekday(g.matches[0].kickoffUtc)}
                  </span>
                  <span className="mt-0.5 text-lg font-extrabold leading-none">
                    {kstDay(g.matches[0].kickoffUtc)}
                  </span>
                  <span className="mt-1 flex h-2.5 items-center">
                    {isToday ? (
                      <span className={`text-[0.5rem] font-bold ${on ? "text-white" : "text-flame"}`}>
                        오늘
                      </span>
                    ) : hasHl ? (
                      <span className={`h-1 w-1 rounded-full ${on ? "bg-white" : "bg-flame"}`} />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          {/* 스크롤 가능 표시: 양 끝 페이드 */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-canvas to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-canvas to-transparent" />
        </div>
      </div>

      <div className="space-y-7 pt-5">
        {groups.map((g) => (
          <section
            key={g.key}
            data-key={g.key}
            ref={(el) => {
              sectionRefs.current[g.key] = el;
            }}
            className="scroll-mt-28"
          >
            <h2 className="mb-2.5 flex items-baseline gap-2 px-0.5">
              <span className="text-sm font-extrabold text-ink">{g.label}</span>
              <span className="text-xs text-muted">{g.matches.length}경기</span>
            </h2>
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
