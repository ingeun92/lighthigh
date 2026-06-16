import ScheduleList from "@/components/ScheduleList";
import { getMatches } from "@/lib/data";

// 대회 중에는 자주 갱신
export const revalidate = 300;

export default async function Home() {
  const matches = await getMatches();
  const nowIso = new Date().toISOString();

  return (
    <div className="mx-auto min-h-full w-full max-w-lg px-4">
      <header className="sticky top-0 z-20 -mx-4 flex h-[52px] items-center gap-2 border-b border-neutral-100 bg-white/90 px-4 backdrop-blur">
        <span className="text-lg font-extrabold tracking-tight">
          light<span className="text-blue-600">high</span>
        </span>
        <span className="text-xs text-neutral-400">월드컵 하이라이트</span>
      </header>

      <main className="pb-10">
        <ScheduleList matches={matches} nowIso={nowIso} />
      </main>
    </div>
  );
}
