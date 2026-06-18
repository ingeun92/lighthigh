#!/usr/bin/env node
// Syncs 2026 World Cup schedule/results from football-data.org to Supabase
// Run: pnpm sync:matches   (node --env-file=.env.local)
//
// Schema (supabase/schema.sql) must be applied first.

import { createClient } from "@supabase/supabase-js";
import { countryFromTla } from "../lib/countries.ts";
import { buildMatchIndex, findMatchByTitle } from "../lib/match-teams.ts";
import { CHZZK_OFFICIAL_CHANNELS } from "../lib/chzzk-channels.ts";

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

// ── Chzzk LIVE auto-linking ──────────────────────────────
// Chzzk (Naver) holds domestic new-media broadcast rights for the World Cup → official broadcasters
// (JTBC/KBS) stream their feeds on the channels in CHZZK_OFFICIAL_CHANNELS. We poll each official channel's
// live-status directly and link its URL to the DB match parsed from the live title.
//   ※ Why poll per channel instead of the keyword search: the live-detail endpoint is geo-blocked (code
//     9004) for GitHub Actions / overseas IPs, and search/lives ranks by popularity so official channels
//     can be pushed out of the result window by "같이 보기" (watch-together) streamers. The polling/v3
//     live-status endpoint returns title+status for a known channel ID even from overseas, and querying
//     only whitelisted channel IDs inherently excludes re-streams and watch-together streams.
const CHZZK_UA = "Mozilla/5.0 (compatible; lighthigh/1.0; +https://lighthigh.today)";

// Returns the current live title for an official channel, or null when it is not currently live (status
// is "CLOSE"/absent — note a stale title lingers on a closed channel, so the status gate is required).
async function chzzkChannelLiveTitle(channelId) {
  try {
    const r = await fetch(
      `https://api.chzzk.naver.com/polling/v3/channels/${channelId}/live-status`,
      { headers: { "User-Agent": CHZZK_UA, Accept: "application/json" } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    const c = j?.content;
    return c?.status === "OPEN" ? c.liveTitle ?? null : null;
  } catch {
    return null;
  }
}

// Polls each official broadcaster channel, links its stream to the current LIVE match parsed from the
// live title, and clears the link for finished matches. (Independent best-effort, separate from football-data sync)
async function syncChzzkLive() {
  // 1) Poll each official broadcaster channel directly for its current live (title + OPEN status).
  const officialLives = (
    await Promise.all(
      CHZZK_OFFICIAL_CHANNELS.map(async (ch) => {
        const liveTitle = await chzzkChannelLiveTitle(ch.channelId);
        return liveTitle ? { channelId: ch.channelId, name: ch.name, liveTitle } : null;
      })
    )
  ).filter(Boolean);

  // 2) Match live title team names to matches → { matchId: Chzzk live URL }
  const liveUrlByMatch = new Map();
  if (officialLives.length) {
    const { data: teams } = await supabase.from("teams").select("id, name_ko");
    const { data: matches } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id");
    const byPair = buildMatchIndex(matches);
    for (const ol of officialLives) {
      const matchId = findMatchByTitle(ol.liveTitle, teams, byPair);
      // If multiple official channels broadcast the same match, keep the first match found
      if (matchId && !liveUrlByMatch.has(matchId)) {
        liveUrlByMatch.set(matchId, `https://chzzk.naver.com/live/${ol.channelId}`);
        console.log(`  · 라이브 매칭: ${ol.name} → "${ol.liveTitle}"`);
      }
    }
  }

  // 3) Fill link for matched matches, clear only for finished matches (minimize writes)
  const { data: current, error: curErr } = await supabase
    .from("matches")
    .select("id, status, live_url")
    .not("live_url", "is", null);
  if (curErr) {
    // live_url column may not exist yet — surface the error explicitly rather than failing silently.
    console.error(`! 치지직 LIVE 연결 건너뜀 — matches.live_url 확인 필요: ${curErr.message}`);
    return;
  }
  // Only clear when match is no longer LIVE. While LIVE, keep the existing link even if the Chzzk title
  // changes (half-time/ad break) or the stream drops — prevents the live button from flickering.
  const toClear = (current ?? [])
    .filter((m) => m.status !== "live" && !liveUrlByMatch.has(m.id))
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

// Active sync guard: keep the 5-min cron but only fetch+upsert during the "active match window"
// when scores can change. Exit immediately during non-match hours (most of the day) to reduce Supabase writes.
//   Active = a match exists with kickoff in [2h before, 5h after] now, or a status=live match exists.
// Exception: every top-of-hour run (minute < 5) always syncs to pick up bracket/schedule changes (heartbeat).
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

  // 1) Collect teams (skip TBD)
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
          flag_url: info.flag, // emoji flag stored as display token
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

  // 2) Upsert matches
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

  // Link Chzzk official channel lives (failure does not affect the match sync result)
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
