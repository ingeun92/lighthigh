#!/usr/bin/env node
// YouTube 공식 채널에서 월드컵 하이라이트를 수집해 경기에 자동 매칭한다.
// 실행: pnpm collect:highlights
//
// 흐름: 채널 uploads 순회(playlistItems, 저비용)
//   → 하이라이트 키워드 필터 → 제목의 팀명으로 DB 경기 매칭
//   → videos.list 로 embeddable 확인 → 매칭되면 highlights, 아니면 highlight_candidates
//
// quota: 채널당 channels.list(1) + playlistItems(수 unit) + videos.list(1~2). 일 수십 unit.

import { createClient } from "@supabase/supabase-js";

const YT_KEY = process.env.YOUTUBE_API_KEY?.trim();
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!YT_KEY || !SB_URL || !SB_SERVICE) {
  console.error("✗ YOUTUBE_API_KEY / SUPABASE_URL / SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });

// 수집 대상 채널 (검증된 곳부터). KBS 정식 채널 확인되면 추가.
const CHANNELS = [{ name: "JTBC Sports", handle: "JTBC_sports" }];
const HIGHLIGHT_KEYWORDS = ["하이라이트", "골 장면", "골장면", "풀타임", "주요장면"];
const MAX_PER_CHANNEL = 50;

const yt = async (path, params) => {
  const qs = new URLSearchParams({ ...params, key: YT_KEY }).toString();
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
  if (!r.ok) throw new Error(`YouTube ${path} HTTP ${r.status}: ${await r.text()}`);
  return r.json();
};

async function uploadsPlaylist(handle) {
  const data = await yt("channels", { part: "contentDetails,snippet", forHandle: handle });
  const item = data.items?.[0];
  return item ? { title: item.snippet.title, uploads: item.contentDetails.relatedPlaylists.uploads } : null;
}

function isHighlight(title) {
  const t = title.toLowerCase();
  return HIGHLIGHT_KEYWORDS.some((k) => t.includes(k.toLowerCase()));
}

// 제목에 등장하는 팀(name_ko) 들을 찾아 경기 매칭
function findMatch(title, teams, matchesByPair) {
  const present = teams.filter((t) => title.includes(t.name_ko));
  // 가장 긴 이름 우선(부분 포함 충돌 방지), 상위 2개 사용
  present.sort((a, b) => b.name_ko.length - a.name_ko.length);
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const key = [present[i].id, present[j].id].sort((a, b) => a - b).join("-");
      if (matchesByPair.has(key)) return matchesByPair.get(key);
    }
  }
  return null;
}

const sortRank = (title) =>
  /3분 하이라이트|풀\s*하이라이트|풀타임/.test(title) ? 0 : /골\s*장면/.test(title) ? 1 : 2;

async function main() {
  // DB 에서 팀/경기 로드 (매칭용)
  const { data: teams } = await supabase.from("teams").select("id, name_ko");
  const { data: matches } = await supabase.from("matches").select("id, home_team_id, away_team_id");
  const matchesByPair = new Map();
  for (const m of matches ?? []) {
    if (m.home_team_id && m.away_team_id) {
      matchesByPair.set([m.home_team_id, m.away_team_id].sort((a, b) => a - b).join("-"), m.id);
    }
  }

  let matched = 0, candidates = 0, scanned = 0;
  const highlightRows = [];
  const candidateRows = [];

  for (const ch of CHANNELS) {
    const resolved = await uploadsPlaylist(ch.handle);
    if (!resolved?.uploads) { console.warn(`! ${ch.name} 채널 조회 실패`); continue; }
    const pl = await yt("playlistItems", {
      part: "snippet,contentDetails", maxResults: String(MAX_PER_CHANNEL), playlistId: resolved.uploads,
    });
    const items = (pl.items ?? []).filter((v) => isHighlight(v.snippet?.title ?? ""));
    scanned += items.length;
    if (items.length === 0) continue;

    // embeddable 확인 (배치)
    const ids = items.map((v) => v.contentDetails.videoId);
    const vids = await yt("videos", { part: "status,snippet", id: ids.join(",") });
    const statusById = new Map((vids.items ?? []).map((v) => [v.id, v.status?.embeddable === true]));

    for (const v of items) {
      const vid = v.contentDetails.videoId;
      const title = v.snippet.title;
      const embeddable = statusById.get(vid) ?? false;
      const matchId = findMatch(title, teams ?? [], matchesByPair);
      const base = {
        source: "youtube", video_id: vid, title,
        channel: resolved.title, thumbnail_url: v.snippet.thumbnails?.medium?.url ?? null,
        published_at: v.contentDetails.videoPublishedAt ?? v.snippet.publishedAt,
      };
      if (matchId) {
        highlightRows.push({
          match_id: matchId, ...base, embeddable, is_approved: true,
          url: `https://www.youtube.com/watch?v=${vid}`, sort_order: sortRank(title),
        });
        matched++;
      } else {
        candidateRows.push({ ...base, channel_id: ch.handle, embeddable, review: "pending" });
        candidates++;
      }
    }
  }

  if (highlightRows.length) {
    const { error } = await supabase.from("highlights").upsert(highlightRows, { onConflict: "match_id,source,video_id" });
    if (error) { console.error("✗ highlights upsert 실패:", error.message); process.exit(1); }
  }
  if (candidateRows.length) {
    const { error } = await supabase.from("highlight_candidates").upsert(candidateRows, { onConflict: "source,video_id" });
    if (error) console.error("! candidates upsert 경고:", error.message);
  }

  console.log(`✓ 수집 완료 — 하이라이트 키워드 영상 ${scanned}건 중`);
  console.log(`  · 경기 자동매칭: ${matched}건 → highlights`);
  console.log(`  · 미매칭(검토 대기): ${candidates}건 → highlight_candidates`);
}

main().catch((e) => { console.error("✗ 오류:", e.message); process.exit(1); });
