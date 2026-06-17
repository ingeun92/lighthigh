// Data loader for the admin dashboard (service_role).

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
  clean: boolean; // true when both team names appear in the title
  reviewed: boolean; // whether an admin has acknowledged and resolved the warning
  needsReview: boolean; // should show the warning badge (!clean && !reviewed)
  isPrimary: boolean; // whether this is the currently featured top-embed video
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
  kickoffUtc: string; // for sorting — most recent match first
  items: AdminHighlight[];
  mismatchCount: number; // number of suspected mismatches (⚠️)
  hasPrimary: boolean; // whether a featured embed video exists
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

  // reviewed column may not exist yet — fall back gracefully
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
      .in("status", ["finished", "live"]) // only matches that have been played
      .order("kickoff_utc", { ascending: false }) // most recent match at top of dropdown (easier candidate assignment)
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

  // Compute the featured video id per match (first embeddable YouTube by sort_order)
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

  // Group highlights by match (already ordered by match_id, sort_order, id)
  const labelById = new Map(matches.map((m) => [m.id, m.label]));
  const kickoffById = new Map((matchRows ?? []).map((m) => [m.id, m.kickoff_utc]));
  const groupMap = new Map<number, HighlightGroup>();
  for (const h of highlights) {
    let g = groupMap.get(h.matchId);
    if (!g) {
      g = {
        matchId: h.matchId,
        label: labelById.get(h.matchId) ?? `${h.homeKo} vs ${h.awayKo}`,
        kickoffUtc: kickoffById.get(h.matchId) ?? "",
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
  // Most recent match first (older matches are rarely corrected) — kickoff descending.
  // ISO UTC strings: lexicographic comparison equals chronological order. Matches needing review are flagged with ⚠️.
  const highlightGroups = [...groupMap.values()].sort((a, b) =>
    b.kickoffUtc.localeCompare(a.kickoffUtc)
  );

  return { matches, highlights, highlightGroups, candidates };
}
