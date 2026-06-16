#!/usr/bin/env node
// football-data.org 2026 월드컵 일정/결과 → Supabase 동기화
// 실행: pnpm sync:matches   (node --env-file=.env.local)
//
// 스키마(supabase/schema.sql)가 먼저 적용돼 있어야 한다.

import { createClient } from "@supabase/supabase-js";
import { countryFromTla } from "../lib/countries.ts";

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

async function main() {
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
}

main().catch((e) => {
  console.error("✗ 오류:", e.message);
  process.exit(1);
});
