// 영상/라이브 제목의 팀명으로 DB 경기를 찾는 공용 매칭 로직.
// YouTube 하이라이트 수집(collect-highlights)·치지직 라이브/VOD(sync-matches)에서 공유한다.

export interface TeamLite {
  id: number;
  name_ko: string | null;
}
interface MatchLite {
  id: number;
  home_team_id: number | null;
  away_team_id: number | null;
}

// 경기를 "정렬된 두 팀 id" 키로 인덱싱 → 제목에서 찾은 팀 쌍으로 O(1) 조회.
export function buildMatchIndex(matches: MatchLite[] | null | undefined): Map<string, number> {
  const byPair = new Map<string, number>();
  for (const m of matches ?? []) {
    if (m.home_team_id && m.away_team_id) {
      byPair.set([m.home_team_id, m.away_team_id].sort((a, b) => a - b).join("-"), m.id);
    }
  }
  return byPair;
}

// 제목에 등장하는 팀명(긴 이름 우선)으로 경기를 찾는다. 매칭 실패 시 null.
export function findMatchByTitle(
  title: string,
  teams: TeamLite[] | null | undefined,
  matchesByPair: Map<string, number>
): number | null {
  const present = (teams ?? []).filter((t) => t.name_ko && title.includes(t.name_ko));
  present.sort((a, b) => (b.name_ko?.length ?? 0) - (a.name_ko?.length ?? 0));
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const key = [present[i].id, present[j].id].sort((a, b) => a - b).join("-");
      if (matchesByPair.has(key)) return matchesByPair.get(key)!;
    }
  }
  return null;
}
