<div align="center">

# lighthigh ⚽🔆

**흩어진 월드컵 하이라이트를, 일정표에서 한 번의 탭으로.**

2026 FIFA 월드컵 경기 일정을 모바일에서 한 눈에 보고, 하이라이트로 바로 연결합니다.

</div>

## 무엇을 해결하나

한국에서 월드컵 파생영상 권한은 네이버(치지직)뿐이고, 하이라이트는 치지직·JTBC·KBS 유튜브에 흩어져 있어 매번 검색하는 "추가 사이클"이 필요합니다. lighthigh는 **일정 → 하이라이트**를 한 동작으로 잇고, 시청 후 보던 위치로 매끄럽게 복귀시킵니다.

## 핵심 기능 (MVP)

- 📅 날짜(KST)별 경기 일정 리스트 — 라운드/조, 스코어, 상태
- ▶️ 끝난 경기 → 하이라이트 한 번에 연결 (임베드 가능 시 인앱 재생, 아니면 외부 딥링크)
- 🔁 외부 이동 후에도 보던 위치 그대로 (스크롤 복원)
- 📱 모바일 우선 + PWA(홈 화면 추가)

## 기술 스택

- **Next.js 16** (App Router) · React 19 · TypeScript · Tailwind v4
- **Supabase** (Postgres) — 일정/하이라이트 저장
- 데이터: **football-data.org**(일정/결과, 무료) · **YouTube Data API**(하이라이트 수집)

## 빠른 시작

```bash
pnpm install
cp .env.local.example .env.local   # 키 입력
pnpm dev                            # http://localhost:3000
```

현재 `lib/data.ts`는 목 데이터(`lib/mock-data.ts`)를 반환하므로 키 없이도 UI가 동작합니다.

### 데이터 소스 검증

```bash
# .env.local 에 FOOTBALL_DATA_TOKEN, YOUTUBE_API_KEY 채운 뒤
pnpm verify:sources
```

football-data.org의 2026 월드컵 응답과, KBS/JTBC 채널 하이라이트의 **임베드 가능 비율**을 측정합니다.

## 문서

- [`docs/PRD.md`](docs/PRD.md) — 제품 요구사항
- [`docs/wireframe.md`](docs/wireframe.md) — 모바일 와이어프레임 & 화면 흐름
- [`supabase/schema.sql`](supabase/schema.sql) — DB 스키마

## 로드맵

| 단계 | 내용 |
|---|---|
| ✅ Day 0 | 스캐폴딩 · 스키마 · 소스 검증 스크립트 · 홈 UI 골격(목 데이터) |
| Day 1–2 | football-data 동기화 + 실데이터 연결 |
| Day 3 | 하이라이트 뷰어 마감 + 관리자 매핑 |
| Day 4 | YouTube 수집 Cron + 치지직 수동 입력 |
| Day 5–6 | PWA·왕복 UX 다듬기 + Vercel 배포 |
