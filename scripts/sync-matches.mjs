#!/usr/bin/env node
// football-data.org 2026 월드컵 일정/결과 → Supabase 동기화
// 실행: pnpm sync:matches   (node --env-file=.env.local)
//
// 스키마(supabase/schema.sql)가 먼저 적용돼 있어야 한다.

import { createClient } from "@supabase/supabase-js";
import { countryFromTla } from "../lib/countries.ts";
import { buildMatchIndex, findMatchByTitle } from "../lib/match-teams.ts";

const FD_TOKEN = process.env.FOOTBALL_DATA_TOKEN?.trim();
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!FD_TOKEN || !SB_URL || !SB_SERVICE) {
  console.error("✗ FOOTBALL_DATA_TOKEN / SUPABASE_URL / SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });

const STATUS_MAP = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  IN_PLAY: "live",
  PAUSED: "live",
  FINISHED: "finished",
  AWARDED: "finished",
  POSTPONED: "postponed",
  SUSPENDED: "postponed",
  CANCELLED: "postponed",
};

const groupLabel = (g) => (g ? g.replace("GROUP_", "") + "조" : null);

// ── 치지직 LIVE 자동 연결 ──────────────────────────────────
// 월드컵 뉴미디어 중계권은 치지직(네이버)이 보유 → JTBC·KBS 화면을 치지직 공식 채널에서 송출.
// 공식(verifiedMark) 채널만 화이트리스트로 두어 무단 재송출 채널 노출을 차단한다.
const CHZZK_LIVE_CHANNELS = [
  { name: "북중미 월드컵 JTBC", channelId: "8ecd602c251f30fd7f09463e9f55609f" },
  { name: "KBS스포츠", channelId: "7e9981082c184c10fcedb771e290d08b" },
  { name: "JTBC Sports", channelId: "e40bd1a9c2c43ea1dea3edf5d3fc51b0" },
];
const CHZZK_UA = "Mozilla/5.0 (compatible; lighthigh/1.0; +https://lighthigh.today)";

async function chzzkLiveDetail(channelId) {
  try {
    const r = await fetch(
      `https://api.chzzk.naver.com/service/v2/channels/${channelId}/live-detail`,
      { headers: { "User-Agent": CHZZK_UA, Accept: "application/json" } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j?.content ?? null;
  } catch {
    return null;
  }
}

// 공식 채널들의 라이브를 폴링해 현재 LIVE 경기에 치지직 중계 링크를 채우고,
// 더 이상 중계되지 않는 경기의 링크는 비운다. (football-data 동기화와 독립된 best-effort)
async function syncChzzkLive() {
  // 1) 공식 채널 중 지금 월드컵 라이브(OPEN)인 것 수집
  const openChannels = [];
  for (const ch of CHZZK_LIVE_CHANNELS) {
    const d = await chzzkLiveDetail(ch.channelId);
    const isWorldcup = /월드컵/.test(`${d?.liveCategoryValue ?? ""} ${d?.liveTitle ?? ""}`);
    if (d?.status === "OPEN" && isWorldcup && d?.liveTitle) {
      openChannels.push({ channelId: ch.channelId, name: ch.name, liveTitle: d.liveTitle });
    }
  }

  // 2) 라이브 제목의 팀명으로 경기 매칭 → { matchId: 치지직 라이브 URL }
  const liveUrlByMatch = new Map();
  if (openChannels.length) {
    const { data: teams } = await supabase.from("teams").select("id, name_ko");
    const { data: matches } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id");
    const byPair = buildMatchIndex(matches);
    for (const oc of openChannels) {
      const matchId = findMatchByTitle(oc.liveTitle, teams, byPair);
      // 같은 경기를 여러 채널이 중계하면 먼저 매칭된 채널(JTBC 우선) 링크를 유지
      if (matchId && !liveUrlByMatch.has(matchId)) {
        liveUrlByMatch.set(matchId, `https://chzzk.naver.com/live/${oc.channelId}`);
        console.log(`  · 라이브 매칭: ${oc.name} → "${oc.liveTitle}"`);
      }
    }
  }

  // 3) 현재 링크가 채워진 경기 중 더 이상 매칭 안 되는 건 비우고, 매칭된 건 채운다 (최소 write)
  const { data: current, error: curErr } = await supabase
    .from("matches")
    .select("id, live_url")
    .not("live_url", "is", null);
  if (curErr) {
    // live_url 컬럼 미적용 등 — 조용히 실패하지 않도록 명시적으로 알린다.
    console.error(`! 치지직 LIVE 연결 건너뜀 — matches.live_url 확인 필요: ${curErr.message}`);
    return;
  }
  const toClear = (current ?? [])
    .filter((m) => !liveUrlByMatch.has(m.id))
    .map((m) => m.id);
  for (const [matchId, url] of liveUrlByMatch) {
    const existing = (current ?? []).find((m) => m.id === matchId);
    if (existing?.live_url !== url) {
      const { error } = await supabase.from("matches").update({ live_url: url }).eq("id", matchId);
      if (error) console.error(`! live_url 업데이트 실패(match ${matchId}): ${error.message}`);
    }
  }
  if (toClear.length) {
    const { error } = await supabase.from("matches").update({ live_url: null }).in("id", toClear);
    if (error) console.error(`! live_url 해제 실패: ${error.message}`);
  }
  console.log(
    `· 치지직 LIVE 연결 — 활성 ${liveUrlByMatch.size}건, 해제 ${toClear.length}건`
  );
}

// 활성 동기화 가드: 5분 크론은 유지하되, 점수가 바뀔 수 있는 "경기 활성 구간"일 때만
// 실제 fetch+upsert를 한다. 비경기 시간(하루 대부분)엔 즉시 종료해 Supabase write 절감.
//   활성 = 킥오프 2h 전 ~ 5h 후(≈ 경기 종료 3h 후) 구간의 경기가 있거나, status=live 인 경기 존재.
// 단, 토너먼트 대진·일정 변경이 idle 중에도 반영되도록 매시 정각 run(분 < 5)은 무조건 동기화(heartbeat).
const PRE_KICKOFF_H = 2;
const POST_KICKOFF_H = 5;

async function shouldSync() {
  if (new Date().getUTCMinutes() < 5) return { sync: true, reason: "heartbeat(매시 정각)" };
  const now = Date.now();
  const lo = new Date(now - POST_KICKOFF_H * 3600_000).toISOString();
  const hi = new Date(now + PRE_KICKOFF_H * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("matches")
    .select("id")
    .or(`and(kickoff_utc.gte.${lo},kickoff_utc.lte.${hi}),status.eq.live`)
    .limit(1);
  if (error) return { sync: true, reason: `가드 조회 실패(${error.message}) → 안전상 동기화` };
  return data?.length
    ? { sync: true, reason: "활성 경기 구간" }
    : { sync: false, reason: "비경기 시간" };
}

async function main() {
  const guard = await shouldSync();
  if (!guard.sync) {
    console.log(`· 동기화 건너뜀 — ${guard.reason} (킥오프 ${PRE_KICKOFF_H}h 전 ~ ${POST_KICKOFF_H}h 후 경기 없음)`);
    return;
  }
  console.log(`· 동기화 진행 — ${guard.reason}`);
  console.log("· football-data 에서 2026 월드컵 경기 가져오는 중...");
  const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
    headers: { "X-Auth-Token": FD_TOKEN },
  });
  if (!res.ok) {
    console.error(`✗ football-data HTTP ${res.status}`);
    process.exit(1);
  }
  const { matches } = await res.json();
  console.log(`· ${matches.length}경기 수신`);

  // 1) 팀 수집 (TBD 제외)
  const teamMap = new Map();
  for (const m of matches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (t?.id && !teamMap.has(t.id)) {
        const info = countryFromTla(t.tla, t.name);
        teamMap.set(t.id, {
          external_id: String(t.id),
          name_en: t.name ?? info.ko,
          name_ko: info.ko,
          country_code: t.tla ?? null,
          flag_url: info.flag, // 이모지 플래그를 표시 토큰으로 저장
        });
      }
    }
  }
  const teams = [...teamMap.values()];
  console.log(`· 팀 ${teams.length}개 upsert...`);
  const { data: teamRows, error: teamErr } = await supabase
    .from("teams")
    .upsert(teams, { onConflict: "external_id" })
    .select("id, external_id");
  if (teamErr) {
    console.error("✗ 팀 upsert 실패:", teamErr.message);
    process.exit(1);
  }
  const idByExternal = new Map(teamRows.map((r) => [r.external_id, r.id]));

  // 2) 경기 upsert
  const rows = matches.map((m) => ({
    external_id: String(m.id),
    stage: m.stage ?? null,
    group_label: groupLabel(m.group),
    home_team_id: m.homeTeam?.id ? idByExternal.get(String(m.homeTeam.id)) ?? null : null,
    away_team_id: m.awayTeam?.id ? idByExternal.get(String(m.awayTeam.id)) ?? null : null,
    home_score: m.score?.fullTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? null,
    status: STATUS_MAP[m.status] ?? "scheduled",
    kickoff_utc: m.utcDate,
    venue: m.venue ?? null,
    updated_at: new Date().toISOString(),
  }));
  console.log(`· 경기 ${rows.length}건 upsert...`);
  const { error: matchErr } = await supabase
    .from("matches")
    .upsert(rows, { onConflict: "external_id" });
  if (matchErr) {
    console.error("✗ 경기 upsert 실패:", matchErr.message);
    process.exit(1);
  }

  const finished = rows.filter((r) => r.status === "finished").length;
  console.log(`✓ 동기화 완료 — 경기 ${rows.length}건 (종료 ${finished}건), 팀 ${teams.length}개`);

  // 치지직 공식 채널 라이브 연결 (실패해도 경기 동기화 결과엔 영향 없음)
  try {
    await syncChzzkLive();
  } catch (e) {
    console.error("! 치지직 LIVE 연결 경고:", e.message);
  }
}

main().catch((e) => {
  console.error("✗ 오류:", e.message);
  process.exit(1);
});
