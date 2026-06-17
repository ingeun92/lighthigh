<div align="center">

# lighthigh ⚽

**One tap from the schedule to the World Cup highlight.**

Browse the 2026 FIFA World Cup schedule at a glance on mobile and jump straight to match highlights.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

## Problem

World Cup highlights are scattered across **Chzzk, JTBC, and KBS YouTube** channels, requiring a separate search after every match. lighthigh connects **schedule → highlight** in a single tap and returns you smoothly to where you left off.

## Features

- 📅 **Date-grouped schedule** — KST timezone, scrollable calendar date strip with arrows, round/group labels, flags, and scores
- ▶️ **Instant highlights** — embeddable videos play in-app; Chzzk and non-embeddable videos open as branded external links. Multiple highlights scroll as a list
- 🙈 **Spoiler protection** — scores are blurred by default; tap "Show result" to reveal (card and modal stay in sync), with a global toggle at the top
- 🔴 **Live match promotion** — LIVE matches auto-rise to the top of their date group with a pulsing indicator and a direct Chzzk broadcast button
- 🔁 **Smooth navigation** — SPA routing + scroll restoration returns you to your place after closing a highlight
- 📱 **Mobile-first + PWA** — installable to the home screen, "Cloud Dancer" (PANTONE 2026) light theme
- 🛠 **Admin panel** — correct mis-matched highlights (collapsible per match), set featured video, approve/reject candidates, manual add

## Tech Stack

- **Next.js 16** (App Router) · React 19 · TypeScript · Tailwind CSS v4 · NanumSquare
- **Supabase** (Postgres + RLS) — schedule and highlight storage
- Data: **football-data.org** (schedule/results, free tier) · **YouTube Data API v3** (highlight collection) · **Chzzk API** (live stream linking and VOD collection)

## Architecture

```mermaid
flowchart LR
  FD[football-data.org] -->|sync:matches| DB[(Supabase)]
  YT[YouTube Data API<br/>JTBC · KBS] -->|collect:highlights<br/>auto-match| DB
  CHZZK[Chzzk API<br/>live + VOD] -->|sync:matches<br/>collect:highlights| DB
  DB <--> APP[Next.js PWA]
  ADMIN[/admin] -->|correct · feature · approve| DB
  APP --> U((User))
```

- **Schedule sync**: football-data WC matches/results → `matches`/`teams` upsert (5-min cron, active-window guard)
- **Highlight collection**: official channel uploads → keyword filter → team-name match → embed check → `highlights` (matched) / `highlight_candidates` (unmatched). Runs every 15 min, skips when no recent match.
- **Chzzk live linking**: searches "월드컵" lives via `search/lives` (works from overseas IPs), links verified official channels to current LIVE matches, clears on match end
- **Semi-automated ops**: auto-collection + admin review/correction for accuracy

## Quick Start

```bash
pnpm install
cp .env.local.example .env.local   # fill in keys (see table below)
pnpm dev                            # http://localhost:3000
```

Apply the Supabase schema by pasting [`supabase/schema.sql`](supabase/schema.sql) into the SQL Editor.  
Without keys, the UI falls back to mock data in `lib/mock-data.ts`.

### Environment Variables

| Variable | Description |
|---|---|
| `FOOTBALL_DATA_TOKEN` | football-data.org API token (schedule/results) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key (highlight collection) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public read) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (sync and admin writes) |
| `ADMIN_TOKEN` | Token protecting `/admin` (omit for unauthenticated local access) |

### Scripts

| Command | Description |
|---|---|
| `pnpm dev` / `build` / `start` | Development / build / production |
| `pnpm lint` | ESLint |
| `pnpm verify:sources` | Verify data sources (WC schedule, embed ratio) |
| `pnpm sync:matches` | Sync football-data schedule → Supabase |
| `pnpm collect:highlights` | Collect YouTube & Chzzk highlights with auto-matching |

## Admin (`/admin`)

- **Highlight correction** — collapsible per match; mis-match suspects (⚠️) auto-expand
- **Feature video** — promote an embed to the top slot with "Move to top"
- **Approve / reject candidates** — link auto-unmatched videos to the correct match
- **Manual add** — attach a Chzzk or YouTube URL directly to a match

> Set `ADMIN_TOKEN` to require token authentication at `/admin/login`.

## Docs

- [`docs/PRD.md`](docs/PRD.md) — product requirements
- [`docs/wireframe.md`](docs/wireframe.md) — mobile wireframes and screen flow

## License

[MIT](LICENSE) © ingeun92

> Videos are provided as **links and embeds only** — no re-hosting. Please comply with YouTube/Chzzk terms of service and broadcast rights policies.
