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
    <div className="mx-auto min-h-full w-full max-w-lg px-5">
      <header className="pb-4 pt-9">
        <p className="eyebrow text-flame">2026 FIFA 월드컵</p>
        <h1 className="mt-2 text-[2.6rem] font-extrabold leading-[0.95] tracking-tight text-ink">
          light<span className="text-flame">high</span>
        </h1>
        <p className="mt-2 text-[0.95rem] text-muted">월드컵 하이라이트, 일정표에서 바로</p>
        <p className="mt-4 text-sm text-muted">
          {todayCount > 0 ? (
            <>
              오늘 <b className="font-extrabold text-ink">{todayCount}경기</b>
              {liveCount > 0 && (
                <>
                  {"  ·  "}
                  <span className="inline-flex items-center gap-1.5 font-bold text-live">
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

      <main className="pb-14">
        <ScheduleList matches={matches} nowIso={nowIso} />
      </main>
    </div>
  );
}
