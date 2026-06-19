// 2026 FIFA World Cup knockout bracket slot labels.
//
// football-data.org does NOT provide placeholder info for undecided knockout
// matches — homeTeam/awayTeam come back fully null until the feeding result is
// known. To show useful labels (e.g. "A조 1위" instead of "미정") before teams
// are confirmed, we map each match's external_id (football-data match id) to its
// official FIFA bracket slot.
//
// Mapping verified as a 1:1 bijection against FIFA match numbers 73–104 by
// cross-referencing UTC kickoff times (Wikipedia / ESPN / FIFA regulations).
// Once the group stage ends (2026-06-27) football-data fills in real teams and
// these labels are automatically superseded by the actual team rows.
//
// Slot label conventions:
//  - Round of 32: group-based slots — "A조 1위" / "B조 2위" / "C·D·F·G·H조 3위".
//    Third-place slots list every group a third-placed qualifier could come from
//    (exact assignment is only fixed after all groups finish). These are static
//    strings.
//  - Round of 16 → Final: a reference to the feeding match (by external_id) plus
//    the outcome that advances. The label is rendered at read time from the
//    feeding match's own kickoff time as "M/D HH:MM 승자" (KST), e.g.
//    "6/29 04:00 승자". The round prefix is omitted because the card header
//    already shows the current round and a slot always points at the prior one.

// A reference to the match whose winner/loser fills this slot.
export interface SlotRef {
  match: string; // external_id of the feeding match
  outcome: "승자" | "패자";
}

// A slot is either a static label (Round of 32) or a reference to a prior match.
export type Slot = string | SlotRef;

export interface BracketSlot {
  home: Slot;
  away: Slot;
}

// Keyed by external_id (football-data match id, stored as text). FIFA match
// number is noted in comments for traceability.
export const KNOCKOUT_SLOTS: Record<string, BracketSlot> = {
  // Round of 32 (FIFA matches 73–88) — static group-based slots
  "537417": { home: "A조 2위", away: "B조 2위" }, // M73
  "537415": { home: "E조 1위", away: "A·B·C·D·F조 3위" }, // M74
  "537418": { home: "F조 1위", away: "C조 2위" }, // M75
  "537423": { home: "C조 1위", away: "F조 2위" }, // M76
  "537416": { home: "I조 1위", away: "C·D·F·G·H조 3위" }, // M77
  "537424": { home: "E조 2위", away: "I조 2위" }, // M78
  "537425": { home: "A조 1위", away: "C·E·F·H·I조 3위" }, // M79
  "537426": { home: "L조 1위", away: "E·H·I·J·K조 3위" }, // M80
  "537421": { home: "D조 1위", away: "B·E·F·I·J조 3위" }, // M81
  "537422": { home: "G조 1위", away: "A·E·H·I·J조 3위" }, // M82
  "537419": { home: "K조 2위", away: "L조 2위" }, // M83
  "537420": { home: "H조 1위", away: "J조 2위" }, // M84
  "537429": { home: "B조 1위", away: "E·F·G·I·J조 3위" }, // M85
  "537427": { home: "J조 1위", away: "H조 2위" }, // M86
  "537430": { home: "K조 1위", away: "D·E·I·J·L조 3위" }, // M87
  "537428": { home: "D조 2위", away: "G조 2위" }, // M88

  // Round of 16 (FIFA matches 89–96) — winners of two Round of 32 matches
  "537375": { home: { match: "537415", outcome: "승자" }, away: { match: "537416", outcome: "승자" } }, // M89 = W74 vs W77
  "537376": { home: { match: "537417", outcome: "승자" }, away: { match: "537418", outcome: "승자" } }, // M90 = W73 vs W75
  "537377": { home: { match: "537423", outcome: "승자" }, away: { match: "537424", outcome: "승자" } }, // M91 = W76 vs W78
  "537378": { home: { match: "537425", outcome: "승자" }, away: { match: "537426", outcome: "승자" } }, // M92 = W79 vs W80
  "537379": { home: { match: "537419", outcome: "승자" }, away: { match: "537420", outcome: "승자" } }, // M93 = W83 vs W84
  "537380": { home: { match: "537421", outcome: "승자" }, away: { match: "537422", outcome: "승자" } }, // M94 = W81 vs W82
  "537381": { home: { match: "537427", outcome: "승자" }, away: { match: "537428", outcome: "승자" } }, // M95 = W86 vs W88
  "537382": { home: { match: "537429", outcome: "승자" }, away: { match: "537430", outcome: "승자" } }, // M96 = W85 vs W87

  // Quarter-finals (FIFA matches 97–100) — winners of two Round of 16 matches
  "537383": { home: { match: "537375", outcome: "승자" }, away: { match: "537376", outcome: "승자" } }, // M97 = W89 vs W90
  "537384": { home: { match: "537379", outcome: "승자" }, away: { match: "537380", outcome: "승자" } }, // M98 = W93 vs W94
  "537385": { home: { match: "537377", outcome: "승자" }, away: { match: "537378", outcome: "승자" } }, // M99 = W91 vs W92
  "537386": { home: { match: "537381", outcome: "승자" }, away: { match: "537382", outcome: "승자" } }, // M100 = W95 vs W96

  // Semi-finals (FIFA matches 101–102) — winners of two quarter-finals
  "537387": { home: { match: "537383", outcome: "승자" }, away: { match: "537384", outcome: "승자" } }, // M101 = W97 vs W98
  "537388": { home: { match: "537385", outcome: "승자" }, away: { match: "537386", outcome: "승자" } }, // M102 = W99 vs W100

  // Third-place play-off (FIFA match 103) — losers of the two semi-finals
  "537389": { home: { match: "537387", outcome: "패자" }, away: { match: "537388", outcome: "패자" } }, // M103 = L101 vs L102

  // Final (FIFA match 104) — winners of the two semi-finals
  "537390": { home: { match: "537387", outcome: "승자" }, away: { match: "537388", outcome: "승자" } }, // M104 = W101 vs W102
};
