// football-data 의 team.tla (3-letter, 예: "KOR") → 한글명 + 국기 이모지
// 누락 시 영문명 + 🏳 로 폴백 (sync 시 처리)

export interface CountryInfo {
  ko: string;
  flag: string;
}

export const COUNTRY_BY_TLA: Record<string, CountryInfo> = {
  KOR: { ko: "대한민국", flag: "🇰🇷" },
  JPN: { ko: "일본", flag: "🇯🇵" },
  AUS: { ko: "호주", flag: "🇦🇺" },
  IRN: { ko: "이란", flag: "🇮🇷" },
  KSA: { ko: "사우디아라비아", flag: "🇸🇦" },
  QAT: { ko: "카타르", flag: "🇶🇦" },
  UZB: { ko: "우즈베키스탄", flag: "🇺🇿" },
  JOR: { ko: "요르단", flag: "🇯🇴" },
  USA: { ko: "미국", flag: "🇺🇸" },
  CAN: { ko: "캐나다", flag: "🇨🇦" },
  MEX: { ko: "멕시코", flag: "🇲🇽" },
  CRC: { ko: "코스타리카", flag: "🇨🇷" },
  PAN: { ko: "파나마", flag: "🇵🇦" },
  HON: { ko: "온두라스", flag: "🇭🇳" },
  BRA: { ko: "브라질", flag: "🇧🇷" },
  ARG: { ko: "아르헨티나", flag: "🇦🇷" },
  URU: { ko: "우루과이", flag: "🇺🇾" },
  URY: { ko: "우루과이", flag: "🇺🇾" },
  BIH: { ko: "보스니아 헤르체고비나", flag: "🇧🇦" },
  COD: { ko: "콩고민주공화국", flag: "🇨🇩" },
  CUW: { ko: "쿠라사오", flag: "🇨🇼" },
  HAI: { ko: "아이티", flag: "🇭🇹" },
  IRQ: { ko: "이라크", flag: "🇮🇶" },
  COL: { ko: "콜롬비아", flag: "🇨🇴" },
  ECU: { ko: "에콰도르", flag: "🇪🇨" },
  PAR: { ko: "파라과이", flag: "🇵🇾" },
  CHI: { ko: "칠레", flag: "🇨🇱" },
  PER: { ko: "페루", flag: "🇵🇪" },
  ENG: { ko: "잉글랜드", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  FRA: { ko: "프랑스", flag: "🇫🇷" },
  ESP: { ko: "스페인", flag: "🇪🇸" },
  GER: { ko: "독일", flag: "🇩🇪" },
  POR: { ko: "포르투갈", flag: "🇵🇹" },
  NED: { ko: "네덜란드", flag: "🇳🇱" },
  ITA: { ko: "이탈리아", flag: "🇮🇹" },
  BEL: { ko: "벨기에", flag: "🇧🇪" },
  CRO: { ko: "크로아티아", flag: "🇭🇷" },
  SUI: { ko: "스위스", flag: "🇨🇭" },
  DEN: { ko: "덴마크", flag: "🇩🇰" },
  POL: { ko: "폴란드", flag: "🇵🇱" },
  SRB: { ko: "세르비아", flag: "🇷🇸" },
  AUT: { ko: "오스트리아", flag: "🇦🇹" },
  SCO: { ko: "스코틀랜드", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  WAL: { ko: "웨일스", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  TUR: { ko: "튀르키예", flag: "🇹🇷" },
  UKR: { ko: "우크라이나", flag: "🇺🇦" },
  NOR: { ko: "노르웨이", flag: "🇳🇴" },
  SWE: { ko: "스웨덴", flag: "🇸🇪" },
  CZE: { ko: "체코", flag: "🇨🇿" },
  GRE: { ko: "그리스", flag: "🇬🇷" },
  MAR: { ko: "모로코", flag: "🇲🇦" },
  SEN: { ko: "세네갈", flag: "🇸🇳" },
  TUN: { ko: "튀니지", flag: "🇹🇳" },
  ALG: { ko: "알제리", flag: "🇩🇿" },
  EGY: { ko: "이집트", flag: "🇪🇬" },
  NGA: { ko: "나이지리아", flag: "🇳🇬" },
  GHA: { ko: "가나", flag: "🇬🇭" },
  CMR: { ko: "카메룬", flag: "🇨🇲" },
  CIV: { ko: "코트디부아르", flag: "🇨🇮" },
  RSA: { ko: "남아프리카공화국", flag: "🇿🇦" },
  MLI: { ko: "말리", flag: "🇲🇱" },
  CPV: { ko: "카보베르데", flag: "🇨🇻" },
  NZL: { ko: "뉴질랜드", flag: "🇳🇿" },
};

export function countryFromTla(tla?: string | null, nameEn?: string): CountryInfo {
  const info = tla ? COUNTRY_BY_TLA[tla.toUpperCase()] : undefined;
  return info ?? { ko: nameEn ?? tla ?? "미정", flag: "🏳️" };
}
