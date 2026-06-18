// Shared logic for matching a DB match by team names found in a video/live title.
// Used by both the YouTube highlight collector (collect-highlights) and Chzzk live/VOD sync (sync-matches).

export interface TeamLite {
  id: number;
  name_ko: string | null;
}
interface MatchLite {
  id: number;
  home_team_id: number | null;
  away_team_id: number | null;
}

// Index matches by a "sorted pair of team IDs" key → O(1) lookup by the team pair found in the title.
export function buildMatchIndex(matches: MatchLite[] | null | undefined): Map<string, number> {
  const byPair = new Map<string, number>();
  for (const m of matches ?? []) {
    if (m.home_team_id && m.away_team_id) {
      byPair.set([m.home_team_id, m.away_team_id].sort((a, b) => a - b).join("-"), m.id);
    }
  }
  return byPair;
}

// Strip all whitespace so titles match team names regardless of spacing, e.g. the official broadcast
// title "남아프리카 공화국" (spaced) still matches the DB name_ko "남아프리카공화국" (unspaced).
const stripSpaces = (s: string) => s.replace(/\s+/g, "");

// Find a match by team names appearing in the title (longer names matched first). Returns null on failure.
export function findMatchByTitle(
  title: string,
  teams: TeamLite[] | null | undefined,
  matchesByPair: Map<string, number>
): number | null {
  const normTitle = stripSpaces(title);
  const present = (teams ?? []).filter(
    (t) => t.name_ko && normTitle.includes(stripSpaces(t.name_ko))
  );
  present.sort((a, b) => (b.name_ko?.length ?? 0) - (a.name_ko?.length ?? 0));
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const key = [present[i].id, present[j].id].sort((a, b) => a - b).join("-");
      if (matchesByPair.has(key)) return matchesByPair.get(key)!;
    }
  }
  return null;
}
