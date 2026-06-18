#!/usr/bin/env node
// Collects 2026 World Cup highlights from official YouTube channels and auto-matches them to matches.
// Run: pnpm collect:highlights
//
// Flow: traverse channel uploads (playlistItems, multiple pages)
//   → filter by highlight keywords → match to DB matches by team names in title
//   → check embeddability via videos.list → matched: highlights table, unmatched: highlight_candidates
//
// quota: channels(1) + playlistItems(page count) + videos(ids/50) per channel. Tens to hundreds of units/day.

import { createClient } from "@supabase/supabase-js";
import { buildMatchIndex, findMatchByTitle } from "../lib/match-teams.ts";
import { CHZZK_OFFICIAL_CHANNELS } from "../lib/chzzk-channels.ts";

const YT_KEY = process.env.YOUTUBE_API_KEY?.trim();
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!YT_KEY || !SB_URL || !SB_SERVICE) {
  console.error("✗ YOUTUBE_API_KEY / SUPABASE_URL / SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });

// Official channels confirmed to post 2026 World Cup highlights (discovered via search)
const CHANNELS = [
  { name: "JTBC Sports", handle: "JTBC_sports" },
  { name: "KBS 올스", channelId: "UCDIB1DOwPPe58M2fHPyVVDA" },
  { name: "KBS News", channelId: "UCcQTRi69dsVYHN3exePtZ1A" },
  { name: "JTBC News", channelId: "UCsU-I-vHLiaMfV_ceaYz5rQ" },
];
// Focus on summary highlights (including KBS "[3-min HL]" and "[goal reel]"). Both team names must match for quality.
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
const MAX_PAGES = 4; // max 50×4 = 200 uploads scanned per channel

// Collection window: only collect when a match kicked off between 3h and 16h ago.
// (Highlights are uploaded after the match ends — collecting earlier is wasteful; outside the window
//  the 15-min cron immediately idles → saves YouTube quota.)
// Window rationale (empirical N=111): JTBC/KBS batch-upload at set times each day, so upload delay
//   peaks at median 10h / max 13h post-kickoff (0 uploads before 3.7h, 100% coverage by 16h).
//   Previous 26h window had ~13h of pure dead-scan; narrowing to 16h halves the scan window per match.
const COLLECT_FROM_MIN = 180;
const COLLECT_TO_HOURS = 16;

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

// ── Chzzk VOD collection ────────────────────────────────────────
// Collects highlight replays uploaded directly by official World Cup channels (CHZZK_OFFICIAL_CHANNELS).
// Chzzk blocks external embedding, so videos are always saved as embeddable:false (external link).
const CHZZK_UA = "Mozilla/5.0 (compatible; lighthigh/1.0; +https://lighthigh.today)";
const CHZZK_VOD_SIZE = 20; // number of latest VODs to scan per channel

// "2026-06-17 12:09:18" (KST, no timezone) → ISO string. Returns null on parse failure.
const parseKstDate = (s) => {
  if (!s) return null;
  const d = new Date(`${s.replace(" ", "T")}+09:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

async function chzzkVideos(channelId) {
  try {
    const r = await fetch(
      `https://api.chzzk.naver.com/service/v1/channels/${channelId}/videos` +
        `?sortType=LATEST&pagingType=PAGE&page=0&size=${CHZZK_VOD_SIZE}`,
      { headers: { "User-Agent": CHZZK_UA, Accept: "application/json" } }
    );
    if (!r.ok) return [];
    const j = await r.json();
    return j?.content?.data ?? [];
  } catch {
    return [];
  }
}

async function main() {
  // Schedule guard: exit immediately if there are no recent matches (highlights not expected yet)
  const nowMs = Date.now();
  const winFrom = new Date(nowMs - COLLECT_TO_HOURS * 3600_000).toISOString();
  const winTo = new Date(nowMs - COLLECT_FROM_MIN * 60_000).toISOString();
  const { data: recent } = await supabase
    .from("matches")
    .select("id")
    .gte("kickoff_utc", winFrom)
    .lte("kickoff_utc", winTo)
    .limit(1);
  if (!recent?.length) {
    console.log(`· 최근 경기 없음(킥오프 ${COLLECT_FROM_MIN}분~${COLLECT_TO_HOURS}시간 전 구간) — 수집 건너뜀`);
    return;
  }

  const { data: teams } = await supabase.from("teams").select("id, name_ko");
  const { data: matches } = await supabase.from("matches").select("id, home_team_id, away_team_id");
  // Videos already in highlights (admin-approved or auto-matched) are not re-queued as candidates.
  const { data: existingHls } = await supabase.from("highlights").select("video_id");
  const inHighlights = new Set((existingHls ?? []).map((h) => h.video_id));
  const matchesByPair = buildMatchIndex(matches);

  let scanned = 0;
  const highlightRows = [];
  const candidateRows = [];
  const seenVid = new Set(); // deduplicate videos across channels

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
      const matchId = findMatchByTitle(title, teams, matchesByPair);
      if (matchId) {
        highlightRows.push({
          match_id: matchId, ...base, embeddable: embed.get(vid) ?? false, is_approved: true,
          url: `https://www.youtube.com/watch?v=${vid}`, sort_order: sortRank(title),
        });
        chMatched++;
      } else if (!inHighlights.has(vid)) {
        candidateRows.push({ ...base, channel_id: ch.channelId ?? ch.handle, embeddable: embed.get(vid) ?? false, review: "pending" });
        chCand++;
      }
    }
    console.log(`  · ${ch.name}: 하이라이트 ${items.length}건 (매칭 ${chMatched}, 미매칭 ${chCand})`);
  }

  // Collect Chzzk official channel VODs (external embedding blocked → embeddable:false, external link)
  for (const ch of CHZZK_OFFICIAL_CHANNELS) {
    const vods = await chzzkVideos(ch.channelId);
    const items = vods.filter((v) => isHighlight(v.videoTitle ?? ""));
    if (items.length === 0) { console.log(`  · ${ch.name}(치지직): 하이라이트 0건`); continue; }
    scanned += items.length;
    let chMatched = 0, chCand = 0;

    for (const v of items) {
      const vid = String(v.videoNo);
      if (!v.videoNo || seenVid.has(vid)) continue;
      seenVid.add(vid);
      const title = v.videoTitle;
      const base = {
        source: "chzzk", video_id: vid, title, channel: ch.name,
        thumbnail_url: v.thumbnailImageUrl ?? null,
        published_at: parseKstDate(v.publishDate),
      };
      const matchId = findMatchByTitle(title, teams ?? [], matchesByPair);
      if (matchId) {
        highlightRows.push({
          match_id: matchId, ...base, embeddable: false, is_approved: true,
          url: `https://chzzk.naver.com/video/${vid}`, sort_order: sortRank(title),
        });
        chMatched++;
      } else if (!inHighlights.has(vid)) {
        candidateRows.push({ ...base, channel_id: ch.channelId, embeddable: false, review: "pending" });
        chCand++;
      }
    }
    console.log(`  · ${ch.name}(치지직): 하이라이트 ${items.length}건 (매칭 ${chMatched}, 미매칭 ${chCand})`);
  }

  if (highlightRows.length) {
    // ignoreDuplicates: leave existing rows untouched (preserves admin-assigned sort_order), insert new only
    const { error } = await supabase
      .from("highlights")
      .upsert(highlightRows, { onConflict: "match_id,source,video_id", ignoreDuplicates: true });
    if (error) { console.error("✗ highlights upsert 실패:", error.message); process.exit(1); }
  }
  if (candidateRows.length) {
    // ignoreDuplicates: preserve admin review status (approved/rejected) for existing candidates — insert new only.
    // (Without this, review resets to 'pending' on every collection run, re-queuing already-classified candidates)
    const { error } = await supabase
      .from("highlight_candidates")
      .upsert(candidateRows, { onConflict: "source,video_id", ignoreDuplicates: true });
    if (error) console.error("! candidates upsert 경고:", error.message);
  }

  console.log(`\n✓ 수집 완료 — 키워드 영상 ${scanned}건`);
  console.log(`  · 경기 자동매칭: ${highlightRows.length}건 → highlights`);
  console.log(`  · 미매칭(검토 대기): ${candidateRows.length}건 → highlight_candidates`);
}

main().catch((e) => { console.error("✗ 오류:", e.message); process.exit(1); });
