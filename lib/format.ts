// Date/time formatting and grouping utilities based on KST (Asia/Seoul)

import type { Match } from "./types";

const KST = "Asia/Seoul";

export function kstDateKey(iso: string): string {
  // 'YYYY-MM-DD' (KST)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  return parts; // en-CA → 2026-06-16
}

export function kstDateLabel(iso: string): string {
  // e.g. 'June 16 (Mon)'
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(iso));
}

export function kstTime(iso: string): string {
  // '21:00'
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function kstDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: KST, day: "numeric" }).format(
    new Date(iso)
  );
}

export function kstWeekday(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: KST, weekday: "short" }).format(
    new Date(iso)
  );
}

export function kstMonth(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: KST, month: "long" }).format(
    new Date(iso)
  );
}

export function kstChip(iso: string): string {
  // '6.16 Mon' — short label for date chip
  const md = new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    month: "numeric",
    day: "numeric",
  }).format(new Date(iso));
  const wd = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, weekday: "short" }).format(
    new Date(iso)
  );
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
