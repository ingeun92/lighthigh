#!/usr/bin/env node
// Syncs 2026 World Cup schedule/results from football-data.org to Supabase
// Run: pnpm sync:matches   (node --env-file=.env.local)
//
// Schema (supabase/schema.sql) must be applied first.

import { createClient } from "@supabase/supabase-js";
import { countryFromTla } from "../lib/countries.ts";
import { buildMatchIndex, findMatchByTitle } from "../lib/match-teams.ts";
import { CHZZK_OFFICIAL_CHANNELS } from "../lib/chzzk-channels.ts";
import { KNOCKOUT_SLOTS } from "../lib/bracket-2026.ts";

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

// Splits football-data's score into the pre-shootout result and the penalty
// shootout. For a knockout decided on penalties, football-data folds the shootout
// tally into `fullTime` (e.g. a 1–1 draw won 6–5 on penalties reports 7–6), which
// otherwise displays as a misleading extra-time score. We strip the shootout back
// out so home_score/away_score stay the draw (after extra time) and home_pen/
// away_pen carry the shootout. Non-shootout matches pass through unchanged.
function splitScore(score) {
  const ft = score?.fullTime ?? {};
  let home = ft.home ?? null;
  let away = ft.away ?? null;
  let homePen = null;
  let awayPen = null;
  const pen = score?.penalties;
  const reg = score?.regularTime;
  if (pen && pen.home != null && pen.away != null) {
    // Explicit shootout node: fullTime = regularTime + extraTime + penalties.
    homePen = pen.home;
    awayPen = pen.away;
    if (home != null) home -= pen.home;
    if (away != null) away -= pen.away;
  } else if (score?.duration === "PENALTY_SHOOTOUT" && reg && reg.home != null && reg.away != null) {
    // No penalties node, but regularTime/extraTime let us recover both halves.
    const et = score?.extraTime ?? {};
    const levelHome = reg.home + (et.home ?? 0);
    const levelAway = reg.away + (et.away ?? 0);
    if (home != null) {
      homePen = home - levelHome;
      home = levelHome;
    }
    if (away != null) {
      awayPen = away - levelAway;
      away = levelAway;
    }
  } else if (score?.duration === "PENALTY_SHOOTOUT") {
    console.warn(`! 승부차기 경기지만 분해 정보 부족 — fullTime 그대로 저장 (id 미상)`);
  }
  return { home, away, homePen, awayPen };
}

// Round-of-32 group-rank slots like "A조 1위" / "E조 2위" are deterministic once
// the group stage ends, but football-data leaves the knockout homeTeam/awayTeam
// null. We resolve those slots from the standings ourselves.
// Round-of-16+ slots are SlotRef objects (not strings) and are skipped here.
const GROUP_RANK_SLOT_RE = /^([A-L])조 ([12])위$/;
const THIRD_PLACE_SLOT_RE = /조 3위$/; // e.g. "A·B·C·D·F조 3위"

// Third-placed qualifiers also need filling, but football-data leaves them null
// too and which 3rd-place group lands in which slot is set by FIFA's allocation
// matrix (495 combinations). This tournament's qualified third-place groups are
// {B,D,E,F,I,J,K,L}; for that combination the matrix maps each group WINNER's
// slot to a third-place GROUP as below. Sourced from the FIFA/Wikipedia matrix
// (winner-column form), cross-checked against each slot's allowed-group list in
// bracket-2026.ts and football-data's own M81→3B (Bosnia) fill. Keyed by match
// external_id → the group whose 3rd-placed team fills that match's away slot.
// Applied only when the live qualified-third groups equal EXPECTED_THIRD_GROUPS;
// otherwise slots stay as labels until football-data publishes the teams (which,
// being checked first, always take precedence once present).
const EXPECTED_THIRD_GROUPS = new Set(["B", "D", "E", "F", "I", "J", "K", "L"]);
const THIRD_PLACE_BY_MATCH = {
  "537425": "E", // 1A(Mexico)      ← 3E
  "537429": "J", // 1B(Switzerland) ← 3J
  "537421": "B", // 1D(USA)         ← 3B
  "537415": "D", // 1E(Germany)     ← 3D
  "537422": "I", // 1G(Belgium)     ← 3I
  "537416": "F", // 1I(France)      ← 3F
  "537430": "L", // 1K(Colombia)    ← 3L
  "537426": "K", // 1L(England)     ← 3K
};

// Resolves a bracket slot to a football-data team id via the standings 1st/2nd
// map, or null when the slot is a third-place label / match reference / unknown.
function slotTeamExternalId(slot, rankByGroup) {
  if (typeof slot !== "string") return null;
  const m = GROUP_RANK_SLOT_RE.exec(slot);
  if (!m) return null;
  return rankByGroup.get(`${m[1]}${m[2]}`) ?? null;
}

// Resolves a knockout match's home/away slot to an internal team id, used only
// when football-data still reports the slot as TBD (homeTeam/awayTeam null).
// `applyThirds` gates the FIFA third-place allocation (see THIRD_PLACE_BY_MATCH).
function knockoutSlotTeamId(matchExternalId, side, ctx) {
  const { rankByGroup, thirdByGroup, applyThirds, idByExternal } = ctx;
  const slot = KNOCKOUT_SLOTS[String(matchExternalId)]?.[side];
  const ext = slotTeamExternalId(slot, rankByGroup);
  if (ext) return idByExternal.get(ext) ?? null;
  // Third-place slot (always the away side of specific Round-of-32 matches).
  if (applyThirds && typeof slot === "string" && THIRD_PLACE_SLOT_RE.test(slot)) {
    const grp = THIRD_PLACE_BY_MATCH[String(matchExternalId)];
    const t = grp ? thirdByGroup.get(grp) : null;
    if (t) return idByExternal.get(String(t.id)) ?? null;
  }
  return null;
}

// Adds a football-data team object to the upsert map (idempotent on team id).
function addTeam(teamMap, t) {
  if (!t?.id || teamMap.has(t.id)) return;
  const info = countryFromTla(t.tla, t.name);
  teamMap.set(t.id, {
    external_id: String(t.id),
    name_en: t.name ?? info.ko,
    name_ko: info.ko,
    country_code: t.tla ?? null,
    flag_url: info.flag, // emoji flag stored as display token
  });
}

// Reads the standings and returns:
//   rank          Map<`${group}${1|2}`, teamObj>   group 1st/2nd
//   thirdByGroup  Map<group, teamObj>              every group's 3rd place
//   qualifiedThirds Set<group>                     the 8 best third-place groups
// Empty/degraded result on any failure so the sync falls back to static labels.
async function fetchStandingsTeams() {
  const rank = new Map();
  const thirdByGroup = new Map();
  const thirds = []; // { group, team, pts, gd, gf } for ranking the best 8
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/standings", {
      headers: { "X-Auth-Token": FD_TOKEN },
    });
    if (!res.ok) {
      console.error(`! standings HTTP ${res.status} — 32강 자동 매핑 생략`);
      return { rank, thirdByGroup, qualifiedThirds: new Set() };
    }
    const { standings } = await res.json();
    for (const s of standings ?? []) {
      if (s.type !== "TOTAL") continue; // home/away splits also exist; we want the overall table
      const letter = (s.group ?? "").replace("Group ", "").trim();
      for (const row of s.table ?? []) {
        const t = row.team;
        if (!t?.id) continue;
        if (row.position === 1 || row.position === 2) {
          rank.set(`${letter}${row.position}`, t);
        } else if (row.position === 3) {
          thirdByGroup.set(letter, t);
          thirds.push({ group: letter, pts: row.points, gd: row.goalDifference, gf: row.goalsFor });
        }
      }
    }
  } catch (e) {
    console.error("! standings 조회 실패 — 32강 자동 매핑 생략:", e.message);
    return { rank, thirdByGroup, qualifiedThirds: new Set() };
  }
  // FIFA third-place ranking: points → goal difference → goals scored. Take 8.
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const qualifiedThirds = new Set(thirds.slice(0, 8).map((x) => x.group));
  return { rank, thirdByGroup, qualifiedThirds };
}

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

  // Diagnostic: log every OPEN official channel's live title so unmatched/late-linked cases
  // (esp. the secondary match of two simultaneous games carried on a sub-channel) are debuggable.
  if (officialLives.length) {
    console.log(`· 치지직 OPEN 공식 채널 ${officialLives.length}곳:`);
    for (const ol of officialLives) console.log(`    - ${ol.name}: "${ol.liveTitle}"`);
  } else {
    console.log("· 치지직 OPEN 공식 채널 없음");
  }

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
    .select("id, status, live_url, kickoff_utc")
    .not("live_url", "is", null);
  if (curErr) {
    // live_url column may not exist yet — surface the error explicitly rather than failing silently.
    console.error(`! 치지직 LIVE 연결 건너뜀 — matches.live_url 확인 필요: ${curErr.message}`);
    return;
  }
  // Keep a set link alive throughout the match's plausible live window, even if the Chzzk title
  // momentarily stops matching (pre-show/half-time/ad break, or sub-channel generic title) or the
  // stream drops — prevents the live button from flickering.
  //   ⚠ Do NOT gate persistence on matches.status: that field is filled by the separate, lagging
  //   football-data sync, so between kickoff and the first IN_PLAY report the link would otherwise be
  //   unprotected and get cleared on any transient title miss (the bug that delayed/dropped links for
  //   two simultaneous matches). Fall back to kickoff age so the link survives that pre-IN_PLAY window.
  const LIVE_LINK_TTL_H = 4; // covers 90' + stoppage + ET/penalties + broadcast lead-out
  const now = Date.now();
  const toClear = (current ?? [])
    .filter((m) => {
      if (liveUrlByMatch.has(m.id)) return false; // re-matched this run → keep
      if (m.status === "finished" || m.status === "postponed") return true; // match over → clear
      // status may still be 'scheduled'/'live' (or lagging) — keep until the live window elapses.
      return now - new Date(m.kickoff_utc).getTime() > LIVE_LINK_TTL_H * 3600_000;
    })
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
  // --force / SYNC_FORCE=1 bypasses the active-window guard for manual runs
  // (e.g. pushing a bracket update immediately instead of waiting for the next
  // top-of-hour heartbeat).
  const force = process.argv.includes("--force") || process.env.SYNC_FORCE === "1";
  const guard = force ? { sync: true, reason: "강제 실행(--force)" } : await shouldSync();
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

  // Standings-based fallback for Round-of-32 slots. football-data leaves knockout
  // homeTeam/awayTeam null even after the group stage ends, so we fill the
  // deterministic group 1st/2nd slots from the standings, and the third-place
  // slots from FIFA's allocation matrix (THIRD_PLACE_BY_MATCH) — but only when
  // the live qualified-third groups match the expected combination.
  const { rank: rankTeams, thirdByGroup, qualifiedThirds } = await fetchStandingsTeams();
  const rankByGroup = new Map([...rankTeams].map(([k, t]) => [k, String(t.id)]));
  const applyThirds =
    qualifiedThirds.size === EXPECTED_THIRD_GROUPS.size &&
    [...EXPECTED_THIRD_GROUPS].every((g) => qualifiedThirds.has(g));
  if (rankByGroup.size) console.log(`· 조별 1·2위 ${rankByGroup.size}슬롯 확정 (32강 자동 매핑)`);
  if (applyThirds) {
    console.log(`· 진출 3위 ${qualifiedThirds.size}개 조 → 32강 3위 슬롯 자동 매핑`);
  } else if (qualifiedThirds.size) {
    console.error(
      `! 진출 3위 조 조합이 예상과 달라 3위 자동 배정 생략 (실제: ${[...qualifiedThirds].sort().join(",")})`
    );
  }

  // 1) Collect teams (skip TBD). Include standings 1st/2nd and 3rd-place teams so
  // their ids resolve in idByExternal even if they only appear in pending slots.
  const teamMap = new Map();
  for (const m of matches) {
    addTeam(teamMap, m.homeTeam);
    addTeam(teamMap, m.awayTeam);
  }
  for (const t of rankTeams.values()) addTeam(teamMap, t);
  for (const t of thirdByGroup.values()) addTeam(teamMap, t);
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
  const slotCtx = { rankByGroup, thirdByGroup, applyThirds, idByExternal };

  // 2) Upsert matches
  const rows = matches.map((m) => {
    const sc = splitScore(m.score);
    return {
      external_id: String(m.id),
      stage: m.stage ?? null,
      group_label: groupLabel(m.group),
      home_team_id: m.homeTeam?.id
        ? idByExternal.get(String(m.homeTeam.id)) ?? null
        : knockoutSlotTeamId(m.id, "home", slotCtx),
      away_team_id: m.awayTeam?.id
        ? idByExternal.get(String(m.awayTeam.id)) ?? null
        : knockoutSlotTeamId(m.id, "away", slotCtx),
      home_score: sc.home,
      away_score: sc.away,
      home_pen: sc.homePen,
      away_pen: sc.awayPen,
      status: STATUS_MAP[m.status] ?? "scheduled",
      kickoff_utc: m.utcDate,
      venue: m.venue ?? null,
      updated_at: new Date().toISOString(),
    };
  });
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
