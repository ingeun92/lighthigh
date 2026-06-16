#!/usr/bin/env node
// YouTube 공식 채널에서 월드컵 하이라이트를 수집해 경기에 자동 매칭한다.
// 실행: pnpm collect:highlights
//
// 흐름: 채널 uploads 순회(playlistItems, 다중 페이지)
//   → 하이라이트 키워드 필터 → 제목의 팀명으로 DB 경기 매칭
//   → videos.list 로 embeddable 확인 → 매칭되면 highlights, 아니면 highlight_candidates
//
// quota: 채널당 channels(1) + playlistItems(페이지수) + videos(ids/50). 일 수십~수백 unit.

import { createClient } from "@supabase/supabase-js";

const YT_KEY = process.env.YOUTUBE_API_KEY?.trim();
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!YT_KEY || !SB_URL || !SB_SERVICE) {
  console.error("✗ YOUTUBE_API_KEY / SUPABASE_URL / SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });

// 2026 월드컵 하이라이트 게시 확인된 공식 채널 (search 발굴 결과)
const CHANNELS = [
  { name: "JTBC Sports", handle: "JTBC_sports" },
  { name: "KBS 올스", channelId: "UCDIB1DOwPPe58M2fHPyVVDA" },
  { name: "KBS News", channelId: "UCcQTRi69dsVYHN3exePtZ1A" },
  { name: "JTBC News", channelId: "UCsU-I-vHLiaMfV_ceaYz5rQ" },
];
// 요약 하이라이트 위주(올스의 "[3분 HL]"·"[골모음]" 포함). 양 팀명 매칭이 품질을 보장한다.
const HIGHLIGHT_KEYWORDS = [
  "하이라이트",
  "highlight",
  "골모음",
  "골 장면",
  "골장면",
  "주요장면",
  "풀타임",
  "hl",
];
const MAX_PAGES = 4; // 채널당 최대 50×4 = 200개 업로드 스캔

const yt = async (path, params) => {
  const qs = new URLSearchParams({ ...params, key: YT_KEY }).toString();
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
  if (!r.ok) throw new Error(`YouTube ${path} HTTP ${r.status}: ${await r.text()}`);
  return r.json();
};

async function uploadsPlaylist(ch) {
  const params = ch.channelId
    ? { part: "contentDetails,snippet", id: ch.channelId }
    : { part: "contentDetails,snippet", forHandle: ch.handle };
  const data = await yt("channels", params);
  const item = data.items?.[0];
  return item
    ? { title: item.snippet.title, uploads: item.contentDetails.relatedPlaylists.uploads }
    : null;
}

async function fetchUploads(playlistId) {
  const all = [];
  let pageToken;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await yt("playlistItems", {
      part: "snippet,contentDetails",
      maxResults: "50",
      playlistId,
      ...(pageToken ? { pageToken } : {}),
    });
    all.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return all;
}

const isHighlight = (title) => {
  const t = title.toLowerCase();
  return HIGHLIGHT_KEYWORDS.some((k) => t.includes(k.toLowerCase()));
};

function findMatch(title, teams, matchesByPair) {
  const present = teams.filter((t) => title.includes(t.name_ko));
  present.sort((a, b) => b.name_ko.length - a.name_ko.length);
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const key = [present[i].id, present[j].id].sort((a, b) => a - b).join("-");
      if (matchesByPair.has(key)) return matchesByPair.get(key);
    }
  }
  return null;
}

const sortRank = (title) => {
  const t = title.toLowerCase();
  if (/3분\s*(하이라이트|hl)|풀\s*하이라이트|풀타임/.test(t)) return 0;
  if (/골\s*장면|골모음/.test(t)) return 1;
  return 2;
};

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function embeddableMap(ids) {
  const map = new Map();
  for (const batch of chunk(ids, 50)) {
    const data = await yt("videos", { part: "status", id: batch.join(",") });
    for (const v of data.items ?? []) map.set(v.id, v.status?.embeddable === true);
  }
  return map;
}

async function main() {
  const { data: teams } = await supabase.from("teams").select("id, name_ko");
  const { data: matches } = await supabase.from("matches").select("id, home_team_id, away_team_id");
  const matchesByPair = new Map();
  for (const m of matches ?? []) {
    if (m.home_team_id && m.away_team_id) {
      matchesByPair.set([m.home_team_id, m.away_team_id].sort((a, b) => a - b).join("-"), m.id);
    }
  }

  let scanned = 0;
  const highlightRows = [];
  const candidateRows = [];
  const seenVid = new Set(); // 채널 간 중복 영상 방지

  for (const ch of CHANNELS) {
    const resolved = await uploadsPlaylist(ch);
    if (!resolved?.uploads) { console.warn(`! ${ch.name} 채널 조회 실패`); continue; }
    const uploads = await fetchUploads(resolved.uploads);
    const items = uploads.filter((v) => isHighlight(v.snippet?.title ?? ""));
    scanned += items.length;
    if (items.length === 0) { console.log(`  · ${ch.name}: 하이라이트 0건`); continue; }

    const ids = items.map((v) => v.contentDetails.videoId);
    const embed = await embeddableMap(ids);
    let chMatched = 0, chCand = 0;

    for (const v of items) {
      const vid = v.contentDetails.videoId;
      if (seenVid.has(vid)) continue;
      seenVid.add(vid);
      const title = v.snippet.title;
      const base = {
        source: "youtube", video_id: vid, title, channel: resolved.title,
        thumbnail_url: v.snippet.thumbnails?.medium?.url ?? null,
        published_at: v.contentDetails.videoPublishedAt ?? v.snippet.publishedAt,
      };
      const matchId = findMatch(title, teams ?? [], matchesByPair);
      if (matchId) {
        highlightRows.push({
          match_id: matchId, ...base, embeddable: embed.get(vid) ?? false, is_approved: true,
          url: `https://www.youtube.com/watch?v=${vid}`, sort_order: sortRank(title),
        });
        chMatched++;
      } else {
        candidateRows.push({ ...base, channel_id: ch.channelId ?? ch.handle, embeddable: embed.get(vid) ?? false, review: "pending" });
        chCand++;
      }
    }
    console.log(`  · ${ch.name}: 하이라이트 ${items.length}건 (매칭 ${chMatched}, 미매칭 ${chCand})`);
  }

  if (highlightRows.length) {
    // ignoreDuplicates: 기존 행은 건드리지 않음(관리자가 지정한 sort_order='대표' 보존), 신규만 삽입
    const { error } = await supabase
      .from("highlights")
      .upsert(highlightRows, { onConflict: "match_id,source,video_id", ignoreDuplicates: true });
    if (error) { console.error("✗ highlights upsert 실패:", error.message); process.exit(1); }
  }
  if (candidateRows.length) {
    const { error } = await supabase.from("highlight_candidates").upsert(candidateRows, { onConflict: "source,video_id" });
    if (error) console.error("! candidates upsert 경고:", error.message);
  }

  console.log(`\n✓ 수집 완료 — 키워드 영상 ${scanned}건`);
  console.log(`  · 경기 자동매칭: ${highlightRows.length}건 → highlights`);
  console.log(`  · 미매칭(검토 대기): ${candidateRows.length}건 → highlight_candidates`);
}

main().catch((e) => { console.error("✗ 오류:", e.message); process.exit(1); });
