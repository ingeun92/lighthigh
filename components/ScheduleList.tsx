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
  const [hideSpoilers, setHideSpoilers] = useState(true);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const stripRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef(false); // 클릭 직후 관찰자 갱신 잠금 (음영 튐 방지)

  const scrollStrip = (dir: 1 | -1) =>
    stripRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });

  // 진입 시 오늘/가장 가까운 경기로 스크롤
  useEffect(() => {
    const key = nearestGroupKey(groups, nowIso);
    if (key && sectionRefs.current[key]) sectionRefs.current[key]!.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 스크롤에 따라 활성 날짜 추적 (클릭 직후 잠금 구간은 무시)
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (lockRef.current) return;
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

  // 날짜 클릭: 즉시 음영 변경 + 잠금 후 부드럽게 스크롤
  const jump = (key: string) => {
    setActiveKey(key);
    lockRef.current = true;
    cellRefs.current[key]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      lockRef.current = false;
    }, 800);
  };

  const activeMonth = useMemo(() => {
    const g = groups.find((x) => x.key === activeKey) ?? groups[0];
    return g ? kstMonth(g.matches[0].kickoffUtc) : "";
  }, [groups, activeKey]);

  return (
    <>
      {/* 달력형 날짜 스트립 */}
      <div className="sticky top-0 z-20 -mx-5 bg-canvas/95 px-5 pb-2 pt-2 backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-bold text-muted">{activeMonth}</p>
          <button
            type="button"
            onClick={() => setHideSpoilers((v) => !v)}
            aria-pressed={hideSpoilers}
            className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-bold transition-colors ${
              hideSpoilers
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-line bg-card text-muted"
            }`}
          >
            {hideSpoilers ? "🙈 점수 가림" : "👁 점수 표시"}
          </button>
        </div>

        {/* 화살표를 날짜 바깥쪽에 배치 (겹침 방지) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="이전 날짜"
            onClick={() => scrollStrip(-1)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-card text-ink shadow-sm active:bg-canvas"
          >
            <span className="-mt-px text-sm font-bold leading-none">‹</span>
          </button>

          <div
            ref={stripRef}
            className="flex flex-1 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
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
                      ? "border-accent bg-accent text-white"
                      : isToday
                        ? "border-accent/50 bg-card text-accent"
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
                      <span className={`text-[0.5rem] font-bold ${on ? "text-white" : "text-accent"}`}>
                        오늘
                      </span>
                    ) : hasHl ? (
                      <span className={`h-1 w-1 rounded-full ${on ? "bg-white" : "bg-accent"}`} />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="다음 날짜"
            onClick={() => scrollStrip(1)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-card text-ink shadow-sm active:bg-canvas"
          >
            <span className="-mt-px text-sm font-bold leading-none">›</span>
          </button>
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
            className="scroll-mt-32"
          >
            <h2 className="mb-2.5 flex items-baseline gap-2 px-0.5">
              <span className="text-sm font-extrabold text-ink">{g.label}</span>
              <span className="text-xs text-muted">{g.matches.length}경기</span>
            </h2>
            <div className="space-y-3">
              {g.matches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  hideSpoilers={hideSpoilers}
                  onOpenHighlights={setActive}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {active && (
        <HighlightViewer
          match={active}
          hideScore={hideSpoilers}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}
