// Official World Cup broadcaster channels on Chzzk (Naver), which holds domestic new-media rights.
// Used by both the live linker (sync-matches) and the VOD highlight collector (collect-highlights).
//
// Why a channel-ID whitelist instead of `verifiedMark`: Chzzk's verified badge is also granted to
// partner/popular streamers, so verified streamers doing a "같이 보기" (watch-together) of a match pass
// a verifiedMark-only filter and get mis-linked. Restricting to these official channel IDs excludes them.
// Add new official channels (e.g. SBS/MBC) here and both scripts pick them up.

export interface ChzzkChannel {
  name: string;
  channelId: string;
}

export const CHZZK_OFFICIAL_CHANNELS: ChzzkChannel[] = [
  { name: "북중미 월드컵 JTBC", channelId: "8ecd602c251f30fd7f09463e9f55609f" },
  { name: "KBS스포츠", channelId: "7e9981082c184c10fcedb771e290d08b" },
  { name: "JTBC Sports", channelId: "e40bd1a9c2c43ea1dea3edf5d3fc51b0" },
];

// Set of official channel IDs for O(1) membership checks when filtering live search results.
export const CHZZK_OFFICIAL_CHANNEL_IDS = new Set(
  CHZZK_OFFICIAL_CHANNELS.map((c) => c.channelId)
);
