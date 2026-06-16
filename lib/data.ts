// 데이터 접근 레이어.
// 현재는 목 데이터를 반환한다. Supabase 연동 후 getMatches() 내부만 교체하면 된다.
//
// 교체 예시:
//   const { data } = await supabase.from("match_list").select(...);
//   return data.map(mapRowToMatch);

import type { Match } from "./types";
import { MOCK_MATCHES } from "./mock-data";

export async function getMatches(): Promise<Match[]> {
  // TODO: Supabase match_list 뷰 쿼리로 대체
  return MOCK_MATCHES;
}
