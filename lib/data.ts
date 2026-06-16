// 데이터 접근 레이어.
// Supabase 가 설정되어 있으면 실데이터, 아니면 목 데이터로 폴백한다.

import type { Match, MatchStatus, Highlight } from "./types";
import { MOCK_MATCHES } from "./mock-data";
import { getSupabase } from "./supabase";

interface TeamRow {
  name_ko: string | null;
  name_en: string | null;
  country_code: string | null;
  flag_url: string | null;
}
interface HighlightRow {
  id: number;
  source: "youtube" | "chzzk";
  url: string;
  video_id: string | null;
  title: string | null;
  channel: string | null;
  embeddable: boolean;
  thumbnail_url: string | null;
}
interface MatchRow {
  id: number;
  stage: string | null;
  group_label: string | null;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  kickoff_utc: string;
  venue: string | null;
  home: TeamRow | null;
  away: TeamRow | null;
  highlights: HighlightRow[] | null;
}

const team = (t: TeamRow | null) => ({
  nameKo: t?.name_ko ?? t?.name_en ?? "미정",
  nameEn: t?.name_en ?? "TBD",
  countryCode: t?.country_code ?? "",
  flag: t?.flag_url ?? "🏳️",
});

function mapRow(r: MatchRow): Match {
  const highlights: Highlight[] = (r.highlights ?? []).map((h) => ({
    id: String(h.id),
    source: h.source,
    url: h.url,
    videoId: h.video_id ?? undefined,
    title: h.title ?? undefined,
    channel: h.channel ?? undefined,
    embeddable: h.embeddable,
    thumbnailUrl: h.thumbnail_url ?? undefined,
  }));
  return {
    id: String(r.id),
    stage: r.stage ?? "",
    groupLabel: r.group_label ?? undefined,
    home: team(r.home),
    away: team(r.away),
    homeScore: r.home_score ?? undefined,
    awayScore: r.away_score ?? undefined,
    status: r.status,
    kickoffUtc: r.kickoff_utc,
    venue: r.venue ?? undefined,
    highlights,
  };
}

export async function getMatches(): Promise<Match[]> {
  const supabase = getSupabase();
  if (!supabase) return MOCK_MATCHES;

  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, stage, group_label, home_score, away_score, status, kickoff_utc, venue,
       home:home_team_id ( name_ko, name_en, country_code, flag_url ),
       away:away_team_id ( name_ko, name_en, country_code, flag_url ),
       highlights ( id, source, url, video_id, title, channel, embeddable, thumbnail_url )`
    )
    .order("kickoff_utc", { ascending: true })
    .returns<MatchRow[]>();

  if (error) {
    console.error("[data] Supabase 조회 실패, 목 데이터로 폴백:", error.message);
    return MOCK_MATCHES;
  }
  if (!data || data.length === 0) return MOCK_MATCHES;
  return data.map(mapRow);
}
