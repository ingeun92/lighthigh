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
//  - Round of 32:  group-based slots — "A조 1위" / "B조 2위" / "C·D·F·G·H조 3위".
//    Third-place slots list every group a third-placed qualifier could come from
//    (exact assignment is only fixed after all groups finish).
//  - Round of 16 → Final: winner/loser of an earlier match, labelled by that
//    match's round and its sequence number within the round
//    (e.g. "32강 2경기 승자", "4강 1경기 패자").

export interface BracketSlot {
  home: string;
  away: string;
}

// Keyed by external_id (football-data match id, stored as text). FIFA match
// number is noted in comments for traceability.
export const KNOCKOUT_SLOTS: Record<string, BracketSlot> = {
  // Round of 32 (FIFA matches 73–88)
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

  // Round of 16 (FIFA matches 89–96) — fed by Round of 32 winners
  "537375": { home: "32강 2경기 승자", away: "32강 5경기 승자" }, // M89 = W74 vs W77
  "537376": { home: "32강 1경기 승자", away: "32강 3경기 승자" }, // M90 = W73 vs W75
  "537377": { home: "32강 4경기 승자", away: "32강 6경기 승자" }, // M91 = W76 vs W78
  "537378": { home: "32강 7경기 승자", away: "32강 8경기 승자" }, // M92 = W79 vs W80
  "537379": { home: "32강 11경기 승자", away: "32강 12경기 승자" }, // M93 = W83 vs W84
  "537380": { home: "32강 9경기 승자", away: "32강 10경기 승자" }, // M94 = W81 vs W82
  "537381": { home: "32강 14경기 승자", away: "32강 16경기 승자" }, // M95 = W86 vs W88
  "537382": { home: "32강 13경기 승자", away: "32강 15경기 승자" }, // M96 = W85 vs W87

  // Quarter-finals (FIFA matches 97–100) — fed by Round of 16 winners
  "537383": { home: "16강 1경기 승자", away: "16강 2경기 승자" }, // M97 = W89 vs W90
  "537384": { home: "16강 5경기 승자", away: "16강 6경기 승자" }, // M98 = W93 vs W94
  "537385": { home: "16강 3경기 승자", away: "16강 4경기 승자" }, // M99 = W91 vs W92
  "537386": { home: "16강 7경기 승자", away: "16강 8경기 승자" }, // M100 = W95 vs W96

  // Semi-finals (FIFA matches 101–102) — fed by quarter-final winners
  "537387": { home: "8강 1경기 승자", away: "8강 2경기 승자" }, // M101 = W97 vs W98
  "537388": { home: "8강 3경기 승자", away: "8강 4경기 승자" }, // M102 = W99 vs W100

  // Third-place play-off (FIFA match 103) — semi-final losers
  "537389": { home: "4강 1경기 패자", away: "4강 2경기 패자" }, // M103 = L101 vs L102

  // Final (FIFA match 104) — semi-final winners
  "537390": { home: "4강 1경기 승자", away: "4강 2경기 승자" }, // M104 = W101 vs W102
};
