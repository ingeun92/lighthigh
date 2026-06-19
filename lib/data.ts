// Data access layer.
// Uses real data when Supabase is configured, falls back to mock data otherwise.

import type { Match, MatchStatus, Highlight } from "./types";
import { MOCK_MATCHES } from "./mock-data";
import { getSupabase } from "./supabase";
import { KNOCKOUT_SLOTS } from "./bracket-2026";

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
  external_id: string | null;
  stage: string | null;
  group_label: string | null;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  kickoff_utc: string;
  venue: string | null;
  live_url: string | null;
  home: TeamRow | null;
  away: TeamRow | null;
  highlights: HighlightRow[] | null;
}

// `slotLabel` is the bracket placeholder (e.g. "A조 1위") shown for undecided
// knockout matches before the feeding team is known. Falls back to "미정".
const team = (t: TeamRow | null, slotLabel?: string) => ({
  nameKo: t?.name_ko ?? t?.name_en ?? slotLabel ?? "미정",
  nameEn: t?.name_en ?? slotLabel ?? "TBD",
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
  const slot = r.external_id ? KNOCKOUT_SLOTS[r.external_id] : undefined;
  return {
    id: String(r.id),
    stage: r.stage ?? "",
    groupLabel: r.group_label ?? undefined,
    home: team(r.home, slot?.home),
    away: team(r.away, slot?.away),
    homeScore: r.home_score ?? undefined,
    awayScore: r.away_score ?? undefined,
    status: r.status,
    kickoffUtc: r.kickoff_utc,
    venue: r.venue ?? undefined,
    liveUrl: r.live_url ?? undefined,
    highlights,
  };
}

export async function getMatches(): Promise<Match[]> {
  const supabase = getSupabase();
  if (!supabase) return MOCK_MATCHES;

  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, external_id, stage, group_label, home_score, away_score, status, kickoff_utc, venue, live_url,
       home:home_team_id ( name_ko, name_en, country_code, flag_url ),
       away:away_team_id ( name_ko, name_en, country_code, flag_url ),
       highlights ( id, source, url, video_id, title, channel, embeddable, thumbnail_url )`
    )
    .order("kickoff_utc", { ascending: true })
    // featured video (top embed) is the one with the lowest sort_order → admin-configurable
    .order("sort_order", { referencedTable: "highlights", ascending: true })
    .order("id", { referencedTable: "highlights", ascending: true })
    .returns<MatchRow[]>();

  if (error) {
    console.error("[data] Supabase 조회 실패, 목 데이터로 폴백:", error.message);
    return MOCK_MATCHES;
  }
  if (!data || data.length === 0) return MOCK_MATCHES;
  return data.map(mapRow);
}
