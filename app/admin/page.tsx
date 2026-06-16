import { getAdminData, type MatchOption } from "@/lib/admin-data";
import {
  reassignHighlight,
  deleteHighlight,
  approveCandidate,
  rejectCandidate,
  addManualHighlight,
  logout,
} from "./actions";

export const dynamic = "force-dynamic";

function MatchOptions({ matches }: { matches: MatchOption[] }) {
  return (
    <>
      <option value="">경기 선택…</option>
      {matches.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </>
  );
}

const selectCls =
  "min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs";
const btn = "rounded-lg px-3 py-1.5 text-xs font-semibold";

export default async function AdminPage() {
  const { matches, highlights, candidates } = await getAdminData();
  const needsReview = highlights.filter((h) => !h.clean).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">lighthigh 관리자</h1>
          <p className="text-sm text-neutral-500">
            하이라이트 {highlights.length}개 · 확인 필요 {needsReview}개 · 후보 {candidates.length}개
          </p>
        </div>
        <form action={logout}>
          <button className={`${btn} bg-neutral-100 text-neutral-600`}>로그아웃</button>
        </form>
      </header>

      {/* ── 후보 큐 ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold text-neutral-800">
          🗂 미매칭 후보 ({candidates.length})
        </h2>
        {candidates.length === 0 && (
          <p className="text-sm text-neutral-400">검토할 후보가 없습니다.</p>
        )}
        <div className="space-y-3">
          {candidates.map((c) => (
            <div key={c.id} className="rounded-xl border border-neutral-200 bg-white p-3">
              <div className="flex gap-3">
                {c.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailUrl} alt="" className="h-12 w-20 shrink-0 rounded object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-neutral-500">
                    {c.channel} · {c.embeddable ? "임베드✓" : "링크만"}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <form action={approveCandidate} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <select name="matchId" className={selectCls} defaultValue="">
                    <MatchOptions matches={matches} />
                  </select>
                  <button className={`${btn} bg-neutral-900 text-white`}>승인</button>
                </form>
                <form action={rejectCandidate}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className={`${btn} bg-red-50 text-red-600`}>거부</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 하이라이트 교정 ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold text-neutral-800">
          🔧 하이라이트 교정 ({highlights.length})
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          ⚠️ 표시는 제목에 양 팀명이 모두 없어 오매칭 의심 — 먼저 확인하세요.
        </p>
        <div className="space-y-3">
          {highlights.map((h) => (
            <div
              key={h.id}
              className={`rounded-xl border bg-white p-3 ${
                h.clean ? "border-neutral-200" : "border-amber-300 bg-amber-50/40"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium">
                  {!h.clean && <span className="mr-1 text-amber-600">⚠️</span>}
                  <span className="break-words">{h.title}</span>
                </p>
                <span className="shrink-0 text-xs text-neutral-400">
                  {h.source === "chzzk" ? "치지직" : "YT"}
                  {h.embeddable ? "·임베드" : ""}
                </span>
              </div>
              <p className="mb-2 text-xs text-neutral-500">
                현재 연결: <b>{h.homeKo} vs {h.awayKo}</b> · {h.channel}
              </p>
              <form action={reassignHighlight} className="flex items-center gap-2">
                <input type="hidden" name="id" value={h.id} />
                <select name="matchId" className={selectCls} defaultValue={h.matchId}>
                  <MatchOptions matches={matches} />
                </select>
                <button className={`${btn} bg-neutral-900 text-white`}>저장</button>
                <button formAction={deleteHighlight} className={`${btn} bg-red-50 text-red-600`}>
                  삭제
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* ── 수동 추가 ── */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-neutral-800">➕ 수동 추가 (치지직/유튜브)</h2>
        <form action={addManualHighlight} className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
          <select name="matchId" className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm" defaultValue="">
            <MatchOptions matches={matches} />
          </select>
          <input
            name="url"
            placeholder="https://chzzk.naver.com/video/... 또는 youtube URL"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="title"
            placeholder="제목 (선택)"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button className={`${btn} w-full bg-neutral-900 py-2 text-white`}>추가</button>
        </form>
      </section>
    </div>
  );
}
