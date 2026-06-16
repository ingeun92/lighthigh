// 관리자 대시보드용 데이터 로더 (service_role).

import { getAdminClient } from "./supabase-admin";

const KST = "Asia/Seoul";
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: KST, month: "numeric", day: "numeric" }).format(
    new Date(iso)
  );

export interface MatchOption {
  id: number;
  label: string;
  homeKo: string;
  awayKo: string;
}

export interface AdminHighlight {
  id: number;
  title: string | null;
  channel: string | null;
  source: "youtube" | "chzzk";
  embeddable: boolean;
  matchId: number;
  homeKo: string;
  awayKo: string;
  clean: boolean; // 제목에 양 팀명이 모두 등장하면 true
  reviewed: boolean; // 관리자가 경고를 확인·해결 처리했는가
  needsReview: boolean; // 경고 표시 대상 (!clean && !reviewed)
  isPrimary: boolean; // 현재 맨 위 임베드되는 대표 영상인가
}

export interface AdminCandidate {
  id: number;
  title: string | null;
  channel: string | null;
  videoId: string;
  embeddable: boolean | null;
  thumbnailUrl: string | null;
}

interface TeamName { name_ko: string | null }
interface MatchRow {
  id: number;
  kickoff_utc: string;
  group_label: string | null;
  home: TeamName | null;
  away: TeamName | null;
}
interface HighlightRow {
  id: number;
  title: string | null;
  channel: string | null;
  source: "youtube" | "chzzk";
  embeddable: boolean;
  sort_order: number | null;
  reviewed: boolean | null;
  match_id: number;
  match: { home: TeamName | null; away: TeamName | null } | null;
}

export interface HighlightGroup {
  matchId: number;
  label: string;
  items: AdminHighlight[];
  mismatchCount: number; // 오매칭 의심(⚠️) 개수
  hasPrimary: boolean; // 임베드 대표 영상 존재 여부
}

export interface AdminData {
  matches: MatchOption[];
  highlights: AdminHighlight[];
  highlightGroups: HighlightGroup[];
  candidates: AdminCandidate[];
}

export async function getAdminData(): Promise<AdminData> {
  const sb = getAdminClient();

  const HL_SELECT =
    "id, title, channel, source, embeddable, sort_order, match_id, match:match_id(home:home_team_id(name_ko), away:away_team_id(name_ko))";

  // reviewed 컬럼이 아직 없을 수 있어 폴백 처리
  const fetchHighlights = async (): Promise<HighlightRow[]> => {
    const q = (sel: string) =>
      sb.from("highlights").select(sel).order("match_id").order("sort_order").order("id");
    const withRev = await q("reviewed, " + HL_SELECT);
    if (!withRev.error) return (withRev.data ?? []) as unknown as HighlightRow[];
    const base = await q(HL_SELECT);
    return ((base.data ?? []) as unknown as HighlightRow[]).map((h) => ({ ...h, reviewed: false }));
  };

  const [{ data: matchRows }, hlRows, { data: candRows }] = await Promise.all([
    sb
      .from("matches")
      .select("id, kickoff_utc, group_label, home:home_team_id(name_ko), away:away_team_id(name_ko)")
      .in("status", ["finished", "live"]) // 치러진 경기만 매핑 대상
      .order("kickoff_utc")
      .returns<MatchRow[]>(),
    fetchHighlights(),
    sb
      .from("highlight_candidates")
      .select("id, title, channel, video_id, embeddable, thumbnail_url")
      .eq("review", "pending")
      .order("published_at", { ascending: false })
      .returns<AdminCandidate[] & { video_id: string; thumbnail_url: string | null }[]>(),
  ]);

  const matches: MatchOption[] = (matchRows ?? []).map((m) => {
    const homeKo = m.home?.name_ko ?? "미정";
    const awayKo = m.away?.name_ko ?? "미정";
    return {
      id: m.id,
      homeKo,
      awayKo,
      label: `${shortDate(m.kickoff_utc)} ${homeKo} vs ${awayKo}${m.group_label ? ` (${m.group_label})` : ""}`,
    };
  });

  // 경기별 대표 영상(첫 임베드 가능 youtube, sort_order 순) id 계산
  const rows = hlRows;
  const primaryIds = new Set<number>();
  const seen = new Set<number>();
  for (const h of rows) {
    if (h.source === "youtube" && h.embeddable && !seen.has(h.match_id)) {
      seen.add(h.match_id);
      primaryIds.add(h.id);
    }
  }

  const highlights: AdminHighlight[] = rows.map((h) => {
    const homeKo = h.match?.home?.name_ko ?? "미정";
    const awayKo = h.match?.away?.name_ko ?? "미정";
    const t = h.title ?? "";
    const clean = t.includes(homeKo) && t.includes(awayKo);
    const reviewed = h.reviewed ?? false;
    return {
      id: h.id,
      title: h.title,
      channel: h.channel,
      source: h.source,
      embeddable: h.embeddable,
      matchId: h.match_id,
      homeKo,
      awayKo,
      clean,
      reviewed,
      needsReview: !clean && !reviewed,
      isPrimary: primaryIds.has(h.id),
    };
  });

  const candidates: AdminCandidate[] = (candRows ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    channel: c.channel,
    videoId: (c as unknown as { video_id: string }).video_id,
    embeddable: c.embeddable,
    thumbnailUrl: (c as unknown as { thumbnail_url: string | null }).thumbnail_url,
  }));

  // 경기별 그룹 (highlights 는 이미 match_id, sort_order, id 순)
  const labelById = new Map(matches.map((m) => [m.id, m.label]));
  const groupMap = new Map<number, HighlightGroup>();
  for (const h of highlights) {
    let g = groupMap.get(h.matchId);
    if (!g) {
      g = {
        matchId: h.matchId,
        label: labelById.get(h.matchId) ?? `${h.homeKo} vs ${h.awayKo}`,
        items: [],
        mismatchCount: 0,
        hasPrimary: false,
      };
      groupMap.set(h.matchId, g);
    }
    g.items.push(h);
    if (h.needsReview) g.mismatchCount += 1;
    if (h.isPrimary) g.hasPrimary = true;
  }
  // 교정 필요한 경기(오매칭 의심)를 먼저
  const highlightGroups = [...groupMap.values()].sort(
    (a, b) => b.mismatchCount - a.mismatchCount
  );

  return { matches, highlights, highlightGroups, candidates };
}
