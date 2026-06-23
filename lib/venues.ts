// 2026 FIFA World Cup host venue metadata, used to show "country · stadium" on match cards.
//
// The football-data.org API returns only the stadium's commercial common name (e.g.
// "MetLife Stadium", "Estadio Azteca"). FIFA also uses a neutral, sponsor-free name during the
// tournament (e.g. "New York New Jersey Stadium", "Mexico City Stadium"), and some venues were
// commercially renamed — so each venue lists every known alias and lookups are normalized
// (case/punctuation-insensitive) to match whatever string the API provides.

export interface VenueInfo {
  cityKo: string; // host city (Korean) — shown in the venue caption
  countryKo: string; // host country (Korean) — kept for reference/fallback
  countryCode: string; // ISO alpha-2, for flagSrc()
  stadiumKo: string; // stadium name, Korean transliteration
}

// Each entry: every name/alias the API might return → one canonical VenueInfo.
const VENUES: { names: string[]; info: VenueInfo }[] = [
  // 🇺🇸 United States (11)
  {
    names: ["MetLife Stadium", "New York New Jersey Stadium"],
    info: { cityKo: "이스트러더퍼드", countryKo: "미국", countryCode: "us", stadiumKo: "메트라이프 스타디움" },
  },
  {
    names: ["AT&T Stadium", "ATT Stadium", "Dallas Stadium"],
    info: { cityKo: "댈러스", countryKo: "미국", countryCode: "us", stadiumKo: "AT&T 스타디움" },
  },
  {
    names: ["SoFi Stadium", "Los Angeles Stadium"],
    info: { cityKo: "로스앤젤레스", countryKo: "미국", countryCode: "us", stadiumKo: "소파이 스타디움" },
  },
  {
    names: ["Arrowhead Stadium", "Kansas City Stadium"],
    info: { cityKo: "캔자스시티", countryKo: "미국", countryCode: "us", stadiumKo: "애로헤드 스타디움" },
  },
  {
    names: ["Levi's Stadium", "Levis Stadium", "San Francisco Bay Area Stadium"],
    info: { cityKo: "샌프란시스코", countryKo: "미국", countryCode: "us", stadiumKo: "리바이스 스타디움" },
  },
  {
    names: ["NRG Stadium", "Houston Stadium"],
    info: { cityKo: "휴스턴", countryKo: "미국", countryCode: "us", stadiumKo: "NRG 스타디움" },
  },
  {
    names: ["Lincoln Financial Field", "Philadelphia Stadium"],
    info: { cityKo: "필라델피아", countryKo: "미국", countryCode: "us", stadiumKo: "링컨 파이낸셜 필드" },
  },
  {
    names: ["Mercedes-Benz Stadium", "Atlanta Stadium"],
    info: { cityKo: "애틀랜타", countryKo: "미국", countryCode: "us", stadiumKo: "메르세데스-벤츠 스타디움" },
  },
  {
    names: ["Lumen Field", "Seattle Stadium"],
    info: { cityKo: "시애틀", countryKo: "미국", countryCode: "us", stadiumKo: "루멘 필드" },
  },
  {
    names: ["Hard Rock Stadium", "Miami Stadium"],
    info: { cityKo: "마이애미", countryKo: "미국", countryCode: "us", stadiumKo: "하드록 스타디움" },
  },
  {
    names: ["Gillette Stadium", "Boston Stadium"],
    info: { cityKo: "보스턴", countryKo: "미국", countryCode: "us", stadiumKo: "질레트 스타디움" },
  },
  // 🇨🇦 Canada (2)
  {
    names: ["BMO Field", "Toronto Stadium"],
    info: { cityKo: "토론토", countryKo: "캐나다", countryCode: "ca", stadiumKo: "BMO 필드" },
  },
  {
    names: ["BC Place", "BC Place Stadium", "BC Place Vancouver", "Vancouver Stadium"],
    info: { cityKo: "밴쿠버", countryKo: "캐나다", countryCode: "ca", stadiumKo: "BC 플레이스" },
  },
  // 🇲🇽 Mexico (3)
  {
    names: [
      "Estadio Azteca",
      "Estadio Banorte",
      "Mexico City Stadium",
      "Estadio Ciudad de México",
      "Estadio Ciudad de Mexico",
    ],
    info: { cityKo: "멕시코시티", countryKo: "멕시코", countryCode: "mx", stadiumKo: "에스타디오 아스테카" },
  },
  {
    names: ["Estadio Akron", "Estadio Guadalajara", "Guadalajara Stadium"],
    info: { cityKo: "과달라하라", countryKo: "멕시코", countryCode: "mx", stadiumKo: "에스타디오 아크론" },
  },
  {
    names: ["Estadio BBVA", "Estadio BBVA Bancomer", "Estadio Monterrey", "Monterrey Stadium"],
    info: { cityKo: "몬테레이", countryKo: "멕시코", countryCode: "mx", stadiumKo: "에스타디오 BBVA" },
  },
];

// Normalize a venue name for matching: lowercase, drop all non-alphanumerics (spaces, punctuation,
// accents like "México" → "mxico"). Both stored aliases and the API string pass through this.
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const INDEX: Record<string, VenueInfo> = {};
for (const v of VENUES) {
  for (const name of v.names) INDEX[normalize(name)] = v.info;
}

// Returns venue metadata for a raw venue string, or null when it doesn't match a known 2026 venue.
export function venueFromName(name?: string | null): VenueInfo | null {
  if (!name) return null;
  return INDEX[normalize(name)] ?? null;
}
