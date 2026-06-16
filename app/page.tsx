import ScheduleList from "@/components/ScheduleList";
import { getMatches } from "@/lib/data";
import { kstDateKey } from "@/lib/format";

// 대회 중에는 자주 갱신
export const revalidate = 300;

export default async function Home() {
  const matches = await getMatches();
  const nowIso = new Date().toISOString();

  const todayKey = kstDateKey(nowIso);
  const todayCount = matches.filter((m) => kstDateKey(m.kickoffUtc) === todayKey).length;
  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <div className="relative mx-auto min-h-full w-full max-w-lg px-4">
      {/* 점등 히어로: 조명이 켜지는 한 번의 순간 (브랜드 모먼트) */}
      <header className="relative -mx-4 overflow-hidden px-4 pb-5 pt-8">
        <div
          aria-hidden
          className="flood flood-warm pointer-events-none absolute inset-x-0 -top-12 h-52"
        />
        <p className="eyebrow text-flood/90">2026 FIFA WORLD CUP</p>
        <h1 className="mt-1.5 font-display text-[2.7rem] font-extrabold leading-none tracking-tight">
          light
          <span className="text-flood [text-shadow:0_0_24px_rgba(255,204,77,0.45)]">high</span>
        </h1>
        <p className="mt-2.5 flex items-center gap-2 text-sm text-fog">
          <span>월드컵 하이라이트, 일정표에서 바로</span>
        </p>
        <p className="mt-1 text-sm text-fog">
          {todayCount > 0 ? (
            <>
              오늘 <b className="font-semibold text-chalk">{todayCount}경기</b>
              {liveCount > 0 && (
                <>
                  {" · "}
                  <span className="inline-flex items-center gap-1.5 font-semibold text-live">
                    <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-live" />
                    지금 {liveCount}경기 진행 중
                  </span>
                </>
              )}
            </>
          ) : (
            "오늘은 예정된 경기가 없어요 · 다가오는 일정을 확인하세요"
          )}
        </p>
      </header>

      <main className="pb-12">
        <ScheduleList matches={matches} nowIso={nowIso} />
      </main>
    </div>
  );
}
