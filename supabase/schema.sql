-- lighthigh DB schema (Supabase / Postgres)
-- 적용: Supabase SQL Editor 에 붙여넣기, 또는 psql < supabase/schema.sql

-- ── teams ────────────────────────────────────────────────
create table if not exists teams (
  id            bigint generated always as identity primary key,
  external_id   text unique,                 -- football-data team id
  name_ko       text not null,
  name_en       text not null,
  country_code  text,                        -- ISO 3166-1 alpha-3 (국기 매핑용)
  flag_url      text,
  created_at    timestamptz not null default now()
);

-- ── matches ──────────────────────────────────────────────
create type match_status as enum ('scheduled', 'live', 'finished', 'postponed');

create table if not exists matches (
  id            bigint generated always as identity primary key,
  external_id   text unique,                 -- football-data match id (동기화 upsert 키)
  stage         text,                        -- GROUP_STAGE / LAST_16 / QUARTER_FINALS ...
  group_label   text,                        -- 'Group H' 등 (null 가능)
  home_team_id  bigint references teams(id),
  away_team_id  bigint references teams(id),
  home_score    int,
  away_score    int,
  status        match_status not null default 'scheduled',
  kickoff_utc   timestamptz not null,
  venue         text,
  updated_at    timestamptz not null default now()
);
create index if not exists matches_kickoff_idx on matches (kickoff_utc);
create index if not exists matches_status_idx on matches (status);

-- ── highlights (승인되어 노출되는 링크) ────────────────────
create type highlight_source as enum ('youtube', 'chzzk');

create table if not exists highlights (
  id            bigint generated always as identity primary key,
  match_id      bigint not null references matches(id) on delete cascade,
  source        highlight_source not null,
  url           text not null,
  video_id      text,                        -- youtube videoId / chzzk videoId
  title         text,
  channel       text,
  embeddable    boolean not null default false,  -- youtube: status.embeddable
  thumbnail_url text,
  published_at  timestamptz,
  is_approved   boolean not null default true,
  reviewed      boolean not null default false, -- 관리자가 오매칭 경고를 확인·해결 처리했는가
  sort_order    int not null default 0,      -- 노출 우선순위 (embed 가능 youtube 우선)
  created_at    timestamptz not null default now(),
  unique (match_id, source, video_id)
);
create index if not exists highlights_match_idx on highlights (match_id);

-- ── highlight_candidates (자동 수집 → 관리자 검토 큐) ───────
create type review_status as enum ('pending', 'approved', 'rejected');

create table if not exists highlight_candidates (
  id            bigint generated always as identity primary key,
  source        highlight_source not null default 'youtube',
  video_id      text not null,
  title         text,
  channel       text,
  channel_id    text,
  embeddable    boolean,
  thumbnail_url text,
  published_at  timestamptz,
  guessed_match_id bigint references matches(id),  -- 자동 추정 (관리자 확정 전)
  review        review_status not null default 'pending',
  collected_at  timestamptz not null default now(),
  unique (source, video_id)
);
create index if not exists candidates_review_idx on highlight_candidates (review);

-- ── 노출용 뷰: 경기 + 팀 + 하이라이트 유무 ─────────────────
create or replace view match_list as
select
  m.id, m.external_id, m.stage, m.group_label,
  m.home_score, m.away_score, m.status, m.kickoff_utc, m.venue,
  ht.name_ko as home_name, ht.country_code as home_cc, ht.flag_url as home_flag,
  at.name_ko as away_name, at.country_code as away_cc, at.flag_url as away_flag,
  (select count(*) from highlights h where h.match_id = m.id and h.is_approved) as highlight_count
from matches m
left join teams ht on ht.id = m.home_team_id
left join teams at on at.id = m.away_team_id;

-- ── RLS: 공개 읽기 전용 (쓰기는 service_role 키가 RLS 우회) ──
alter table teams      enable row level security;
alter table matches    enable row level security;
alter table highlights enable row level security;
alter table highlight_candidates enable row level security;

create policy "public read teams"      on teams      for select using (true);
create policy "public read matches"    on matches    for select using (true);
-- 승인된 하이라이트만 공개
create policy "public read highlights" on highlights for select using (is_approved);
-- 후보 큐는 비공개 (관리자는 service_role 로 접근)

grant select on match_list to anon, authenticated;
