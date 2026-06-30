// lighthigh shared types

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
  embeddable: boolean; // whether in-app embedding is available (Chzzk blocks external embeds — always opens as external link)
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
  // Penalty shootout result (knockout draws only). homeScore/awayScore stay the
  // pre-shootout draw (after extra time); these hold the shootout tally, e.g. 6:5.
  homePen?: number;
  awayPen?: number;
  status: MatchStatus;
  kickoffUtc: string; // ISO
  venue?: string;
  liveUrl?: string; // official Chzzk broadcast link while the match is LIVE (external link)
  highlights: Highlight[];
}

// Round stage labels (Korean display strings)
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
