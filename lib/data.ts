// Data access layer.
// Uses real data when Supabase is configured, falls back to mock data otherwise.

import type { Match, MatchStatus, Highlight } from "./types";
import { MOCK_MATCHES } from "./mock-data";
import { getSupabase } from "./supabase";
import { KNOCKOUT_SLOTS, type Slot } from "./bracket-2026";
import { VENUE_BY_EXTERNAL_ID } from "./match-venues";
import { kstShortDateTime } from "./format";

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

// Resolve a bracket slot to a display label. Static strings (Round of 32) pass
// through; match references (Round of 16 onward) render from the feeding match's
// kickoff time, e.g. "6/29 04:00 승자".
function resolveSlot(
  slot: Slot | undefined,
  kickoffByExternalId: Map<string, string>
): string | undefined {
  if (slot == null) return undefined;
  if (typeof slot === "string") return slot;
  const kickoff = kickoffByExternalId.get(slot.match);
  return kickoff ? `${kstShortDateTime(kickoff)} ${slot.outcome}` : undefined;
}

function mapRow(r: MatchRow, kickoffByExternalId: Map<string, string>): Match {
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
    home: team(r.home, resolveSlot(slot?.home, kickoffByExternalId)),
    away: team(r.away, resolveSlot(slot?.away, kickoffByExternalId)),
    homeScore: r.home_score ?? undefined,
    awayScore: r.away_score ?? undefined,
    status: r.status,
    kickoffUtc: r.kickoff_utc,
    // football-data provides no venue for the World Cup, so fall back to the
    // static external_id → stadium map sourced from the official FIFA schedule.
    venue: r.venue ?? (r.external_id ? VENUE_BY_EXTERNAL_ID[r.external_id] : undefined) ?? undefined,
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
  // A genuinely empty result is a real "no matches" state — return it as-is.
  // (Substituting mock fixtures here would mask an empty/unseeded DB with fake data.)
  if (!data) return MOCK_MATCHES;
  if (data.length === 0) return [];
  // Map external_id → kickoff so Round of 16+ slots can render the feeding
  // match's date/time (e.g. "6/29 04:00 승자").
  const kickoffByExternalId = new Map<string, string>();
  for (const r of data) {
    if (r.external_id) kickoffByExternalId.set(r.external_id, r.kickoff_utc);
  }
  return data.map((r) => mapRow(r, kickoffByExternalId));
}
