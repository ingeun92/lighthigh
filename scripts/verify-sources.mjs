#!/usr/bin/env node
// lighthigh data source verification
// Run: pnpm verify:sources   (internally uses node --env-file=.env.local)
//
// Checks:
//   1. football-data.org  : verify 2026 World Cup (WC) schedule/results response structure
//   2. YouTube Data API   : measure embeddable ratio of recent highlight videos from KBS/JTBC channels
//
// The embeddable ratio is the key metric that drives the in-app smooth-return strategy.

const FD_TOKEN = process.env.FOOTBALL_DATA_TOKEN?.trim();
const YT_KEY = process.env.YOUTUBE_API_KEY?.trim();

const HIGHLIGHT_KEYWORDS = ["하이라이트", "highlight", "골장면", "골 장면", "풀타임", "주요장면"];
// Official Korean broadcaster channels confirmed via research
const CHANNELS = [
  { name: "KBS 스포츠", id: "UCDIB1DOwPPe58M2fHPyVVDA", handle: null },
  { name: "JTBC 스포츠", id: null, handle: "JTBC_sports" },
];

const line = (c = "─") => console.log(c.repeat(60));
const ok = (s) => `\x1b[32m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;
const warn = (s) => `\x1b[33m${s}\x1b[0m`;

async function getJSON(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, ok: res.ok, body };
}

// ── 1. football-data.org ──────────────────────────────────────────
async function verifyFootballData() {
  line("=");
  console.log("1) football-data.org — 2026 월드컵 일정/결과");
  line("=");
  if (!FD_TOKEN) {
    console.log(bad("✗ FOOTBALL_DATA_TOKEN 이 .env.local 에 없습니다. 건너뜁니다."));
    return { ok: false, reason: "no token" };
  }
  const { status, ok: success, body } = await getJSON(
    "https://api.football-data.org/v4/competitions/WC/matches",
    { headers: { "X-Auth-Token": FD_TOKEN } }
  );
  if (!success) {
    console.log(bad(`✗ HTTP ${status}`), typeof body === "object" ? JSON.stringify(body) : body);
    if (status === 403) console.log(warn("  → 무료 tier 에 WC 가 없거나 토큰 권한 부족일 수 있습니다."));
    return { ok: false, status };
  }
  const matches = body.matches ?? [];
  const season = body.competition?.name ?? "?";
  console.log(ok(`✓ HTTP 200 — ${season}, 경기 ${matches.length}건`));
  // verify season/year
  const seasonInfo = body.season ?? matches[0]?.season ?? {};
  if (seasonInfo.startDate) console.log(`  시즌: ${seasonInfo.startDate} ~ ${seasonInfo.endDate}`);
  // status distribution
  const byStatus = {};
  for (const m of matches) byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
  console.log(`  상태 분포: ${JSON.stringify(byStatus)}`);
  // sample one match
  const sample = matches.find((m) => m.status === "FINISHED") ?? matches[0];
  if (sample) {
    console.log("  샘플 경기:");
    console.log(`    ${sample.utcDate} [${sample.stage}${sample.group ? "/" + sample.group : ""}] ` +
      `${sample.homeTeam?.name} ${sample.score?.fullTime?.home ?? "-"} : ${sample.score?.fullTime?.away ?? "-"} ${sample.awayTeam?.name} (${sample.status})`);
  }
  const is2026 = (seasonInfo.startDate ?? "").startsWith("2026") ||
    matches.some((m) => (m.utcDate ?? "").startsWith("2026"));
  console.log(is2026 ? ok("  → 2026 데이터 확인됨 ✓") : warn("  → 2026 데이터 여부 불명확 (응답 확인 필요)"));
  return { ok: true, count: matches.length, is2026 };
}

// ── 2. YouTube — embeddable ratio ─────────────────────────────────
async function resolveUploadsPlaylist(ch) {
  const param = ch.id ? `id=${ch.id}` : `forHandle=${ch.handle}`;
  const { body } = await getJSON(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&${param}&key=${YT_KEY}`
  );
  const item = body.items?.[0];
  if (!item) return null;
  return {
    title: item.snippet?.title,
    uploads: item.contentDetails?.relatedPlaylists?.uploads,
  };
}

async function verifyYouTube() {
  line("=");
  console.log("2) YouTube Data API — 하이라이트 임베드 가능 비율");
  line("=");
  if (!YT_KEY) {
    console.log(bad("✗ YOUTUBE_API_KEY 가 .env.local 에 없습니다. 건너뜁니다."));
    return { ok: false, reason: "no key" };
  }
  let totalCandidates = 0, totalEmbeddable = 0;
  for (const ch of CHANNELS) {
    const resolved = await resolveUploadsPlaylist(ch);
    if (!resolved?.uploads) {
      console.log(bad(`✗ ${ch.name}: 채널/업로드 목록 조회 실패`));
      continue;
    }
    // fetch most recent 50 uploads
    const { body: plBody, status: plStatus } = await getJSON(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${resolved.uploads}&key=${YT_KEY}`
    );
    if (plStatus !== 200) {
      console.log(bad(`✗ ${ch.name}: playlistItems HTTP ${plStatus}`), JSON.stringify(plBody).slice(0, 200));
      continue;
    }
    const uploads = plBody.items ?? [];
    // filter by highlight keywords
    const cands = uploads.filter((v) => {
      const t = (v.snippet?.title ?? "").toLowerCase();
      return HIGHLIGHT_KEYWORDS.some((k) => t.includes(k.toLowerCase()));
    });
    const ids = cands.map((v) => v.contentDetails?.videoId).filter(Boolean).slice(0, 50);
    let embeddable = 0;
    let statuses = [];
    if (ids.length) {
      const { body: vBody } = await getJSON(
        `https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${ids.join(",")}&key=${YT_KEY}`
      );
      for (const v of vBody.items ?? []) {
        const e = v.status?.embeddable === true;
        if (e) embeddable++;
        statuses.push({ title: (v.snippet?.title ?? "").slice(0, 40), embeddable: e });
      }
    }
    totalCandidates += ids.length;
    totalEmbeddable += embeddable;
    const ratio = ids.length ? Math.round((embeddable / ids.length) * 100) : 0;
    console.log(`\n  ▸ ${resolved.title ?? ch.name} (최근 50개 업로드 중)`);
    console.log(`    하이라이트 후보: ${cands.length}건, 임베드 가능: ${ok(embeddable)}/${ids.length} (${ratio}%)`);
    for (const s of statuses.slice(0, 5)) {
      console.log(`      ${s.embeddable ? ok("embed✓") : warn("link만")}  ${s.title}`);
    }
  }
  line();
  const overall = totalCandidates ? Math.round((totalEmbeddable / totalCandidates) * 100) : 0;
  console.log(`종합 임베드 가능 비율: ${overall}%  (${totalEmbeddable}/${totalCandidates})`);
  if (overall >= 60) console.log(ok("→ 인앱 임베드 전략 유효. 임베드 우선 + 직링크 폴백."));
  else if (totalCandidates === 0) console.log(warn("→ 후보 0건. 대회 중 키워드/채널 재확인 필요."));
  else console.log(warn("→ 임베드 비율 낮음. '외부 이동 + 스크롤 복원'을 1순위로 설계 (예상대로)."));
  return { ok: true, overall, totalCandidates };
}

(async () => {
  console.log("\nlighthigh 데이터 소스 검증\n");
  const results = {};
  try { results.footballData = await verifyFootballData(); }
  catch (e) { console.log(bad("football-data 오류:"), e.message); }
  console.log();
  try { results.youtube = await verifyYouTube(); }
  catch (e) { console.log(bad("YouTube 오류:"), e.message); }
  line("=");
  console.log("검증 요약");
  line("=");
  console.log("  football-data WC:", results.footballData?.ok ? ok(`OK (${results.footballData.count}경기)`) : bad("실패/건너뜀"));
  console.log("  YouTube 임베드율:", results.youtube?.ok ? ok(`${results.youtube.overall}%`) : bad("실패/건너뜀"));
  console.log();
})();
