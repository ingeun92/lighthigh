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
  { name: "북중미 월드컵 KBS2", channelId: "4df4756104a54e28e967bff6dc08e319" },
  { name: "KBS스포츠", channelId: "7e9981082c184c10fcedb771e290d08b" },
  { name: "JTBC Sports", channelId: "e40bd1a9c2c43ea1dea3edf5d3fc51b0" },
  // Dedicated sub-channels JTBC/KBS use for the *secondary* of two simultaneous matches (the marquee
  // game stays on the main channels above). Without these, the secondary match's live link and highlight
  // VODs are never picked up — e.g. 모로코 vs 아이티 ran alongside 브라질 vs 스코틀랜드 and was carried here.
  { name: "북중미 월드컵 JTBCSPORTS", channelId: "1656686e9f50aa321a83482046318bac" },
  { name: "북중미 월드컵 KBSNSPORTS", channelId: "78d7051ca32dc6adf2c853d37180533c" },
];
