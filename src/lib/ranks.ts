import { RANK_NAMES, RANK_THRESHOLDS } from "./copy";

// "Friends" = unique_participants_count on the creator's quiz row.
// Confirmed explicitly by the brief: NOT shares, NOT raw opens — only
// unique people who completed the quiz. Both Rank and Level are pure
// functions of this one number, so they can never disagree with each
// other or drift out of sync.

export interface RankInfo {
  tierIndex: number; // 1..11, matches profiles.current_level
  name: (typeof RANK_NAMES)[number];
  minCount: number;
  nextName: (typeof RANK_NAMES)[number] | null;
  nextMinCount: number | null;
  friendsToNext: number | null;
}

export function getRankInfo(friends: number): RankInfo {
  let tierIndex = 1;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (friends >= RANK_THRESHOLDS[i]) {
      tierIndex = i + 1;
      break;
    }
  }
  const name = RANK_NAMES[tierIndex - 1];
  const minCount = RANK_THRESHOLDS[tierIndex - 1];
  const hasNext = tierIndex < RANK_NAMES.length;
  const nextName = hasNext ? RANK_NAMES[tierIndex] : null;
  const nextMinCount = hasNext ? RANK_THRESHOLDS[tierIndex] : null;
  const friendsToNext = hasNext ? Math.max(0, (nextMinCount as number) - friends) : null;
  return { tierIndex, name, minCount, nextName, nextMinCount, friendsToNext };
}

// Level is deliberately simple and uncapped: every completed quiz
// attempt is exactly one more friend, and every friend is exactly one
// more level. See README for why this reading of the brief was chosen
// (both worked examples in the brief — "Level 1 -> 1 friend -> Level 2"
// and "Level 15 -> 1 more friend -> Level 16" — are consistent with a
// flat +1 relationship and nothing else in the brief specifies a
// different curve).
export function getLevel(friends: number): number {
  return friends + 1;
}

export function isLevelMilestone(level: number): boolean {
  return level >= 2 && (level - 2) % 3 === 0;
}

export function rankByIndex(tierIndex: number): { name: string; minCount: number } {
  const clamped = Math.min(Math.max(tierIndex, 1), RANK_NAMES.length);
  return { name: RANK_NAMES[clamped - 1], minCount: RANK_THRESHOLDS[clamped - 1] };
}

export function fullRankPath() {
  return RANK_NAMES.map((name, i) => ({ name, minCount: RANK_THRESHOLDS[i], tierIndex: i + 1 }));
}
