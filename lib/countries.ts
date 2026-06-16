// football-data 의 team.tla (3-letter, 예: "KOR") → 한글명 + 국기(이모지 폴백) + ISO alpha-2
// 국기 이미지는 flagcdn.com 의 SVG 를 alpha-2 코드로 불러온다.

export interface CountryInfo {
  ko: string;
  flag: string; // 이모지 (이미지 실패 시 폴백)
  iso2: string; // flagcdn 용 (예: "kr", 영국 구성국은 "gb-eng")
}

export const COUNTRY_BY_TLA: Record<string, CountryInfo> = {
  KOR: { ko: "대한민국", flag: "🇰🇷", iso2: "kr" },
  JPN: { ko: "일본", flag: "🇯🇵", iso2: "jp" },
  AUS: { ko: "호주", flag: "🇦🇺", iso2: "au" },
  IRN: { ko: "이란", flag: "🇮🇷", iso2: "ir" },
  KSA: { ko: "사우디아라비아", flag: "🇸🇦", iso2: "sa" },
  QAT: { ko: "카타르", flag: "🇶🇦", iso2: "qa" },
  UZB: { ko: "우즈베키스탄", flag: "🇺🇿", iso2: "uz" },
  JOR: { ko: "요르단", flag: "🇯🇴", iso2: "jo" },
  USA: { ko: "미국", flag: "🇺🇸", iso2: "us" },
  CAN: { ko: "캐나다", flag: "🇨🇦", iso2: "ca" },
  MEX: { ko: "멕시코", flag: "🇲🇽", iso2: "mx" },
  CRC: { ko: "코스타리카", flag: "🇨🇷", iso2: "cr" },
  PAN: { ko: "파나마", flag: "🇵🇦", iso2: "pa" },
  HON: { ko: "온두라스", flag: "🇭🇳", iso2: "hn" },
  BRA: { ko: "브라질", flag: "🇧🇷", iso2: "br" },
  ARG: { ko: "아르헨티나", flag: "🇦🇷", iso2: "ar" },
  URU: { ko: "우루과이", flag: "🇺🇾", iso2: "uy" },
  URY: { ko: "우루과이", flag: "🇺🇾", iso2: "uy" },
  COL: { ko: "콜롬비아", flag: "🇨🇴", iso2: "co" },
  ECU: { ko: "에콰도르", flag: "🇪🇨", iso2: "ec" },
  PAR: { ko: "파라과이", flag: "🇵🇾", iso2: "py" },
  CHI: { ko: "칠레", flag: "🇨🇱", iso2: "cl" },
  PER: { ko: "페루", flag: "🇵🇪", iso2: "pe" },
  ENG: { ko: "잉글랜드", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", iso2: "gb-eng" },
  FRA: { ko: "프랑스", flag: "🇫🇷", iso2: "fr" },
  ESP: { ko: "스페인", flag: "🇪🇸", iso2: "es" },
  GER: { ko: "독일", flag: "🇩🇪", iso2: "de" },
  POR: { ko: "포르투갈", flag: "🇵🇹", iso2: "pt" },
  NED: { ko: "네덜란드", flag: "🇳🇱", iso2: "nl" },
  ITA: { ko: "이탈리아", flag: "🇮🇹", iso2: "it" },
  BEL: { ko: "벨기에", flag: "🇧🇪", iso2: "be" },
  CRO: { ko: "크로아티아", flag: "🇭🇷", iso2: "hr" },
  SUI: { ko: "스위스", flag: "🇨🇭", iso2: "ch" },
  DEN: { ko: "덴마크", flag: "🇩🇰", iso2: "dk" },
  POL: { ko: "폴란드", flag: "🇵🇱", iso2: "pl" },
  SRB: { ko: "세르비아", flag: "🇷🇸", iso2: "rs" },
  AUT: { ko: "오스트리아", flag: "🇦🇹", iso2: "at" },
  SCO: { ko: "스코틀랜드", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", iso2: "gb-sct" },
  WAL: { ko: "웨일스", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", iso2: "gb-wls" },
  TUR: { ko: "튀르키예", flag: "🇹🇷", iso2: "tr" },
  UKR: { ko: "우크라이나", flag: "🇺🇦", iso2: "ua" },
  NOR: { ko: "노르웨이", flag: "🇳🇴", iso2: "no" },
  SWE: { ko: "스웨덴", flag: "🇸🇪", iso2: "se" },
  CZE: { ko: "체코", flag: "🇨🇿", iso2: "cz" },
  GRE: { ko: "그리스", flag: "🇬🇷", iso2: "gr" },
  MAR: { ko: "모로코", flag: "🇲🇦", iso2: "ma" },
  SEN: { ko: "세네갈", flag: "🇸🇳", iso2: "sn" },
  TUN: { ko: "튀니지", flag: "🇹🇳", iso2: "tn" },
  ALG: { ko: "알제리", flag: "🇩🇿", iso2: "dz" },
  EGY: { ko: "이집트", flag: "🇪🇬", iso2: "eg" },
  NGA: { ko: "나이지리아", flag: "🇳🇬", iso2: "ng" },
  GHA: { ko: "가나", flag: "🇬🇭", iso2: "gh" },
  CMR: { ko: "카메룬", flag: "🇨🇲", iso2: "cm" },
  CIV: { ko: "코트디부아르", flag: "🇨🇮", iso2: "ci" },
  RSA: { ko: "남아프리카공화국", flag: "🇿🇦", iso2: "za" },
  MLI: { ko: "말리", flag: "🇲🇱", iso2: "ml" },
  CPV: { ko: "카보베르데", flag: "🇨🇻", iso2: "cv" },
  NZL: { ko: "뉴질랜드", flag: "🇳🇿", iso2: "nz" },
  BIH: { ko: "보스니아 헤르체고비나", flag: "🇧🇦", iso2: "ba" },
  COD: { ko: "콩고민주공화국", flag: "🇨🇩", iso2: "cd" },
  CUW: { ko: "퀴라소", flag: "🇨🇼", iso2: "cw" },
  HAI: { ko: "아이티", flag: "🇭🇹", iso2: "ht" },
  IRQ: { ko: "이라크", flag: "🇮🇶", iso2: "iq" },
};

export function countryFromTla(tla?: string | null, nameEn?: string): CountryInfo {
  const info = tla ? COUNTRY_BY_TLA[tla.toUpperCase()] : undefined;
  return info ?? { ko: nameEn ?? tla ?? "미정", flag: "🏳️", iso2: "" };
}

// flagcdn.com SVG URL. country_code(tla) 또는 iso2 를 받는다. 매핑 없으면 null.
export function flagSrc(code?: string | null): string | null {
  if (!code) return null;
  const c = code.toLowerCase();
  // 이미 iso2 형태(2글자 또는 gb-xxx)면 그대로, tla 면 매핑
  const iso2 =
    c.length === 2 || c.startsWith("gb-")
      ? c
      : COUNTRY_BY_TLA[code.toUpperCase()]?.iso2 ?? "";
  return iso2 ? `https://flagcdn.com/${iso2}.svg` : null;
}
