import { getAdminData, type MatchOption, type AdminHighlight } from "@/lib/admin-data";
import {
  reassignHighlight,
  deleteHighlight,
  featureHighlight,
  resolveHighlight,
  unresolveHighlight,
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

const selectCls = "min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs";
const btn = "rounded-lg px-3 py-1.5 text-xs font-semibold";

// Individual highlight item within a match group
function HighlightItem({ h, matches }: { h: AdminHighlight; matches: MatchOption[] }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        h.needsReview
          ? "border-amber-300 bg-amber-50/40"
          : h.isPrimary
            ? "border-blue-300 bg-blue-50/40"
            : "border-neutral-200"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium">
          {h.needsReview && <span className="mr-1 text-amber-600">⚠️</span>}
          <span className="break-words">{h.title}</span>
        </p>
        <span className="flex shrink-0 items-center gap-1 text-xs text-neutral-400">
          {h.isPrimary && (
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
              대표
            </span>
          )}
          {h.source === "chzzk" ? "치지직" : "YT"}
          {h.embeddable ? "·임베드" : ""}
        </span>
      </div>
      <p className="mb-2 text-xs text-neutral-400">{h.channel}</p>
      {h.needsReview && (
        <form action={resolveHighlight} className="mb-2">
          <input type="hidden" name="id" value={h.id} />
          <button className={`${btn} w-full bg-amber-500 text-white`}>
            ✓ 경고 해결 (확인 완료)
          </button>
        </form>
      )}
      {!h.clean && h.reviewed && (
        <form action={unresolveHighlight} className="mb-2 flex items-center gap-1 text-xs text-neutral-400">
          <input type="hidden" name="id" value={h.id} />
          <span>✓ 확인됨</span>·
          <button className="underline">경고 되돌리기</button>
        </form>
      )}
      <div className="flex items-center gap-2">
        <form action={reassignHighlight} className="flex flex-1 items-center gap-2">
          <input type="hidden" name="id" value={h.id} />
          <select name="matchId" className={selectCls} defaultValue={h.matchId} title="다른 경기로 이동">
            <MatchOptions matches={matches} />
          </select>
          <button className={`${btn} bg-neutral-900 text-white`}>이동</button>
        </form>
        {h.source === "youtube" && h.embeddable && !h.isPrimary && (
          <form action={featureHighlight}>
            <input type="hidden" name="id" value={h.id} />
            <button className={`${btn} bg-blue-600 text-white`}>맨 위로</button>
          </form>
        )}
        <form action={deleteHighlight}>
          <input type="hidden" name="id" value={h.id} />
          <button className={`${btn} bg-red-50 text-red-600`}>삭제</button>
        </form>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const { matches, highlightGroups, candidates } = await getAdminData();
  const reviewCount = highlightGroups.filter((g) => g.mismatchCount > 0).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">lighthigh 관리자</h1>
          <p className="text-sm text-neutral-500">
            {highlightGroups.length}경기 · 교정 필요 {reviewCount}경기 · 후보 {candidates.length}개
          </p>
        </div>
        <form action={logout}>
          <button className={`${btn} bg-neutral-100 text-neutral-600`}>로그아웃</button>
        </form>
      </header>

      {/* ── Candidate queue ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold text-neutral-800">🗂 미매칭 후보 ({candidates.length})</h2>
        {candidates.length === 0 && <p className="text-sm text-neutral-400">검토할 후보가 없습니다.</p>}
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

      {/* ── Highlight correction (collapsible per match) ── */}
      <section className="mb-8">
        <h2 className="mb-1 text-sm font-bold text-neutral-800">
          🔧 하이라이트 교정 — 경기별 ({highlightGroups.length}경기)
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          기본은 접힘 — 요약줄의 <b className="text-amber-600">⚠️</b> 개수를 보고 필요한 경기만 펼치세요. 확인을
          마치면 <b>경고 해결</b> 로 표시를 없앨 수 있습니다. <b className="text-blue-600">대표</b> 는 앱 맨 위
          임베드 영상 — 부적합하면 다른 임베드 영상에서 <b>맨 위로</b>.
        </p>
        <div className="space-y-2">
          {highlightGroups.map((g) => (
            <details
              key={g.matchId}
              className="group rounded-xl border border-neutral-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
                <span className="text-neutral-400 transition-transform group-open:rotate-90">▸</span>
                <span className="flex-1 text-sm font-bold text-neutral-800">{g.label}</span>
                {g.mismatchCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">
                    ⚠️ {g.mismatchCount}
                  </span>
                )}
                {!g.hasPrimary && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.65rem] font-bold text-red-600">
                    대표 없음
                  </span>
                )}
                <span className="text-xs text-neutral-400">{g.items.length}개</span>
              </summary>
              <div className="space-y-3 border-t border-neutral-100 p-3">
                {g.items.map((h) => (
                  <HighlightItem key={h.id} h={h} matches={matches} />
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── Manual add ── */}
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
