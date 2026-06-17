// lighthigh 공용 타입

export type MatchStatus = "scheduled" | "live" | "finished" | "postponed";
export type HighlightSource = "youtube" | "chzzk";

export interface Team {
  nameKo: string;
  nameEn: string;
  countryCode: string; // ISO alpha-3
  flag: string; // 이모지 또는 flag_url
}

export interface Highlight {
  id: string;
  source: HighlightSource;
  url: string;
  videoId?: string;
  title?: string;
  channel?: string;
  embeddable: boolean; // youtube 인앱 임베드 가능 여부 (치지직은 외부 임베드 차단으로 항상 외부 링크)
  thumbnailUrl?: string;
}

export interface Match {
  id: string;
  stage: string; // GROUP_STAGE / LAST_16 ...
  groupLabel?: string;
  home: Team;
  away: Team;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  kickoffUtc: string; // ISO
  venue?: string;
  liveUrl?: string; // LIVE 중일 때 치지직 공식 중계 링크 (외부 링크)
  highlights: Highlight[];
}

// 라운드 한글 라벨
export const STAGE_LABEL: Record<string, string> = {
  GROUP_STAGE: "조별리그",
  LAST_32: "32강",
  LAST_16: "16강",
  QUARTER_FINALS: "8강",
  SEMI_FINALS: "4강",
  THIRD_PLACE: "3·4위전",
  FINAL: "결승",
};

export const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "예정",
  live: "진행중",
  finished: "종료",
  postponed: "연기",
};
