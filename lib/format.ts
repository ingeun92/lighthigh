// Date/time formatting and grouping utilities based on KST (Asia/Seoul)

import type { Match } from "./types";

const KST = "Asia/Seoul";

// Intl.DateTimeFormat construction is expensive; build each formatter once at
// module load and reuse it (these are pure, options never change per call).
const FMT_DATE_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const FMT_DATE_LABEL = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  month: "long",
  day: "numeric",
  weekday: "short",
});
const FMT_TIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const FMT_MD_EN = new Intl.DateTimeFormat("en-US", {
  timeZone: KST,
  month: "numeric",
  day: "numeric",
});
const FMT_DAY = new Intl.DateTimeFormat("en-US", { timeZone: KST, day: "numeric" });
const FMT_WEEKDAY = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, weekday: "short" });
const FMT_MONTH = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, month: "long" });
const FMT_MD_KO = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  month: "numeric",
  day: "numeric",
});

export function kstDateKey(iso: string): string {
  // 'YYYY-MM-DD' (KST)
  return FMT_DATE_KEY.format(new Date(iso)); // en-CA → 2026-06-16
}

export function kstDateLabel(iso: string): string {
  // e.g. 'June 16 (Mon)'
  return FMT_DATE_LABEL.format(new Date(iso));
}

export function kstTime(iso: string): string {
  // '21:00'
  return FMT_TIME.format(new Date(iso));
}

export function kstShortDateTime(iso: string): string {
  // '6/29 04:00' — compact month/day + time, used for bracket slot labels
  return `${FMT_MD_EN.format(new Date(iso))} ${kstTime(iso)}`;
}

export function kstDay(iso: string): string {
  return FMT_DAY.format(new Date(iso));
}

export function kstWeekday(iso: string): string {
  return FMT_WEEKDAY.format(new Date(iso));
}

export function kstMonth(iso: string): string {
  return FMT_MONTH.format(new Date(iso));
}

export function kstChip(iso: string): string {
  // '6.16 Mon' — short label for date chip
  const md = FMT_MD_KO.format(new Date(iso));
  const wd = FMT_WEEKDAY.format(new Date(iso));
  return `${md.replace(/\.$/, "").replace(/\. /, ".")} ${wd}`;
}

export interface DateGroup {
  key: string;
  label: string;
  matches: Match[];
}

export function groupByKstDate(matches: Match[]): DateGroup[] {
  const sorted = [...matches].sort(
    (a, b) => +new Date(a.kickoffUtc) - +new Date(b.kickoffUtc)
  );
  const map = new Map<string, DateGroup>();
  for (const m of sorted) {
    const key = kstDateKey(m.kickoffUtc);
    if (!map.has(key)) {
      map.set(key, { key, label: kstDateLabel(m.kickoffUtc), matches: [] });
    }
    map.get(key)!.matches.push(m);
  }
  // Promote LIVE matches to the top within each date group (multiple LIVE matches retain kickoff order).
  // Stable sort — non-LIVE matches keep their original kickoff order → auto-restored after the match ends.
  for (const g of map.values()) {
    g.matches.sort((a, b) => {
      const liveDiff = (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1);
      return liveDiff !== 0
        ? liveDiff
        : +new Date(a.kickoffUtc) - +new Date(b.kickoffUtc);
    });
  }
  return [...map.values()];
}

// Initial scroll target: today's group key, or the nearest future date group
export function nearestGroupKey(groups: DateGroup[], nowIso: string): string | null {
  if (groups.length === 0) return null;
  const todayKey = kstDateKey(nowIso);
  const exact = groups.find((g) => g.key === todayKey);
  if (exact) return exact.key;
  const future = groups.find((g) => g.key >= todayKey);
  return (future ?? groups[groups.length - 1]).key;
}
