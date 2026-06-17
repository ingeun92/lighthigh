// Mock data for verifying the UI without API keys or a database.
// Replaced by the Supabase query in lib/data.ts when the real integration is active.

import type { Match } from "./types";

const team = (nameKo: string, nameEn: string, cc: string, flag: string) => ({
  nameKo,
  nameEn,
  countryCode: cc,
  flag,
});

export const MOCK_MATCHES: Match[] = [
  {
    id: "m1",
    stage: "GROUP_STAGE",
    groupLabel: "Group H",
    home: team("대한민국", "South Korea", "KOR", "🇰🇷"),
    away: team("포르투갈", "Portugal", "POR", "🇵🇹"),
    homeScore: 2,
    awayScore: 1,
    status: "finished",
    kickoffUtc: "2026-06-16T03:00:00Z",
    venue: "MetLife Stadium",
    highlights: [
      {
        id: "h1",
        source: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
        title: "[하이라이트] 대한민국 2-1 포르투갈",
        channel: "KBS 스포츠",
        embeddable: true,
      },
      {
        id: "h2",
        source: "chzzk",
        url: "https://chzzk.naver.com/video/3291847",
        videoId: "3291847",
        title: "대한민국 vs 포르투갈 다시보기",
        channel: "치지직",
        embeddable: false,
      },
    ],
  },
  {
    id: "m2",
    stage: "GROUP_STAGE",
    groupLabel: "Group H",
    home: team("가나", "Ghana", "GHA", "🇬🇭"),
    away: team("우루과이", "Uruguay", "URU", "🇺🇾"),
    status: "scheduled",
    kickoffUtc: "2026-06-16T12:00:00Z",
    venue: "SoFi Stadium",
    highlights: [],
  },
  {
    id: "m3",
    stage: "GROUP_STAGE",
    groupLabel: "Group A",
    home: team("멕시코", "Mexico", "MEX", "🇲🇽"),
    away: team("브라질", "Brazil", "BRA", "🇧🇷"),
    homeScore: 0,
    awayScore: 3,
    status: "finished",
    kickoffUtc: "2026-06-17T01:00:00Z",
    venue: "Estadio Azteca",
    highlights: [
      {
        id: "h3",
        source: "youtube",
        url: "https://www.youtube.com/watch?v=abc12345",
        videoId: "abc12345",
        title: "[풀 하이라이트] 멕시코 0-3 브라질",
        channel: "JTBC 스포츠",
        embeddable: false, // embed blocked → external link fallback demo
      },
    ],
  },
  {
    id: "m4",
    stage: "GROUP_STAGE",
    groupLabel: "Group A",
    home: team("아르헨티나", "Argentina", "ARG", "🇦🇷"),
    away: team("일본", "Japan", "JPN", "🇯🇵"),
    status: "live",
    homeScore: 1,
    awayScore: 1,
    kickoffUtc: "2026-06-17T18:00:00Z",
    venue: "AT&T Stadium",
    highlights: [],
  },
];
