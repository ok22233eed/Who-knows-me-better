// =============================================================================
// ALL user-facing strings live here — nowhere else in the app hardcodes
// copy. Two categories, clearly marked:
//
//  VERBATIM  — exact wording from the brief. Do not reword these even a
//              little; the brief was explicit that this text is locked.
//  EDITABLE  — my own copy, written to match the brief's voice, for
//              moments the brief didn't specify exact wording for
//              (errors, empty states, share captions, settings). Change
//              these freely.
// =============================================================================

// Fixed question/follow-up UUIDs — MUST match supabase/migrations/
// 20260901000000_app_content_and_notifications.sql exactly. Used to
// special-case Q1's compound follow-up (an MCQ plus two supplementary
// text fields, all saved onto that one follow-up's answer).
export const QUESTION_IDS = {
  Q1_CRUSH: "00000000-0000-4000-8000-000000000001",
  Q1_FOLLOWUP_WHERE: "00000000-0000-4000-8000-0000000000f1",
  Q3_RELATIONSHIP_NOW: "00000000-0000-4000-8000-000000000003",
  Q3_FOLLOWUP_WHO: "00000000-0000-4000-8000-0000000000f3",
  Q7_RELATIONSHIP_BEFORE: "00000000-0000-4000-8000-000000000007",
  Q7_FOLLOWUP_HOW_MANY: "00000000-0000-4000-8000-0000000000f7",
} as const;

// --- Screen 1: Quiz Landing ------------------------------------------------ VERBATIM
export const landing = {
  heading: (name: string) => `How well do you know ${name}?`,
  startCta: "Start Quiz →",
  teaserPrefix: "🌶️", // decorative marker used ONLY in this one teaser box
  teaserQuestion: (name: string) => `Who is ${name}'s crush?`,
  teaserPlaceholder: "Tap here to type your answer…",
  leaderboardTitle: "🏆 Leaderboard",
  identityLevelLine: (level: number, rankName: string) => `Level ${level} · ${rankName}`,
};

// --- Screen 2: Name before results ------------------------------------- VERBATIM
export const nameEntry = {
  heading: "Enter your name",
  body: (name: string) =>
    `Enter your correct name to get your place on the leaderboard and let ${name} know who answered.`,
  placeholder: "Your name",
  continueCta: "Continue →",
};

// --- Screen 3: After finishing the quiz --------------------------------- VERBATIM
export const result = {
  heading: (name: string) => `You know ${name} this well 👀`,
  leaderboardTitle: "🏆 Leaderboard",
  yourPosition: (rank: number) => `Your position: #${rank}`,
  pitchHeading: "Think your friends know you?",
  pitchBody: "Create your own quiz in 30 seconds",
  createCta: "Create My Quiz →",
};

// --- Screen 4: Personal dashboard ---------------------------------------- VERBATIM
export const dashboard = {
  readyHeading: "Your quiz is ready 🎉",
  readyBody: "Share your quiz and see who knows you best.",
  copyLinkCta: "Copy Link",
  shareCta: "Share your quiz →",
  notifPromptHeading: "Turn on notifications",
  notifPromptBody: "So you know when someone answers your quiz and when your rank or level changes.",
  addHomeHeading: "Add this app to your home screen",
  addHomeBody: "So you can open your quiz anytime with one tap.",
  yourRank: "YOUR RANK",
  rankLine: (level: number, rankName: string) => `Rank #${level} · ${rankName}`,
  rankPathHint: (friends: number, nextLevel: number, nextName: string) =>
    `${friends} ${friends === 1 ? "friend" : "friends"} → Rank ${nextLevel} · ${nextName}`,
  rankPathCta: "Tap to see your full rank path →",
  yourLevel: "YOUR LEVEL",
  levelLine: (level: number) => `Level ${level}`,
  levelPathHint: (friends: number, nextLevel: number) =>
    `${friends} more ${friends === 1 ? "friend" : "friends"} → Level ${nextLevel}`,
  levelPathCta: "Tap to see your full level path →",
  friendsCount: (n: number) => `👥 Friends who opened your quiz: ${n}`,
  howIKnowTitle: "📊 How Well I Know →",
  howIKnowSub: "See your scores on other people's quizzes",
  howTheyKnowTitle: "👀 How Well They Know Me →",
  howTheyKnowSub: "See scores and details from your quiz",
};

// --- Rank / Level full-path sub-screens ---------------------------------- VERBATIM
export const rankScreen = {
  yourGlobalRank: "Your Global Rank",
  aheadOf: (pct: number) => `You're ahead of ${pct}% of players`,
  nextGoalHeading: "Your next goal",
  you: "YOU",
};

export const levelScreen = {
  yourLevel: "Your Level",
  seeHowYouRank: (level: number) => `See how you rank among other Level ${level} players.`,
  nextGoalHeading: "Your next goal",
  you: "YOU",
  youAreHere: "YOU ARE HERE",
};

// --- Rank names (11 named tiers) --------------------------- VERBATIM (order matters)
export const RANK_NAMES = [
  "Known",
  "Familiar",
  "Connected",
  "Insider",
  "Trusted",
  "Confidant",
  "Kindred",
  "Inner Circle",
  "Rare",
  "Iconic",
  "Unforgettable",
] as const;

export const RANK_THRESHOLDS = [0, 1, 3, 6, 10, 15, 21, 28, 36, 43, 50] as const;

// --- "How Well I Know" -------------------------------------------------- VERBATIM
export const howIKnow = {
  quizzesAnswered: (n: number) => `Quizzes Answered: ${n}`,
  averageScore: (pct: number) => `Average Score: ${pct}%`,
  entryLine: (name: string, pct: number) => `${name}'s Quiz — ${pct}%`,
};

// --- "How Well They Know Me" --------------------------------------------- VERBATIM
export const howTheyKnow = {
  personHeading: (name: string, pct: number) => `${name} — ${pct}%`,
  correctFraction: (correct: number, total: number) => `${correct}/${total} correct`,
  questionCorrect: (n: number) => `Q${n} ✓ Correct`,
  questionWrong: (n: number) => `Q${n} ✕ Wrong`,
};

// --- Notifications ------------------------------------------------------- VERBATIM
// Keyed by notification_type exactly as constrained in the notifications
// table. [X] is filled in from payload at render time.
export const notificationCopy: Record<
  string,
  { title: (payload: any) => string; action: string }
> = {
  new_participant: { title: () => "👀 Someone answered your quiz", action: "See their score →" },
  rank_up: { title: () => "🏆 Your rank went up", action: "See your new rank →" },
  close_rank: { title: () => "🔥 Someone is close to your rank", action: "See who →" },
  close_level: { title: () => "⚡ Someone is close to your level", action: "See who →" },
  passed_you: { title: () => "🚨 Someone passed you", action: "See who →" },
  level_tease: {
    title: (p) => `🎯 1 more friend → Level ${p?.next_level ?? ""}`,
    action: "Keep going →",
  },
  level_milestone: {
    title: (p) => `🚀 You reached Level ${p?.level ?? ""}!`,
    action: "See your progress →",
  },
};

// =============================================================================
// EDITABLE — my own copy, not specified verbatim by the brief.
// =============================================================================

export const editable = {
  appTagline: "A quiz about you, answered by everyone who knows you.",
  loginHeading: "Log back in",
  loginBody: "Enter your username and your recovery code.",
  loginUsernamePlaceholder: "@username",
  loginCodePlaceholder: "Recovery code",
  loginCta: "Log in",
  loginError: "That username or code doesn't match. Double-check both and try again.",
  newHereCta: "New here? Create your quiz instead",
  alreadyHaveAccount: "Already answered a quiz before? Log in",

  recoveryLabel: "Recovery code",
  recoveryHelp: "Save this — it's the only way to open your account on another phone.",
  recoveryFirstTime: "This is your recovery code. Screenshot it or write it down now — we can only show it to you once.",
  recoveryCopied: "Copied",
  recoveryRegenerate: "Lost it? Get a new one",
  recoveryRegenerateConfirm: "This replaces your old code — it'll stop working. Continue?",

  createNameHeading: "What's your name?",
  createNameBody: "This is how your friends will see you on the leaderboard.",
  createHeading: "Create your quiz",
  createBody: (n: number, total: number) => `Answer these ${total} questions about yourself — question ${n} of ${total}.`,
  createFollowupBadge: "Bonus question",
  createFinishCta: "Publish my quiz",
  createAlreadyLive: "Your quiz is already live — your answers are locked in.",
  createProgress: (n: number, total: number) => `${n} of ${total}`,

  revealMessages: [
    "Checking your answers…",
    "Tallying the score…",
    "Loading the leaderboard…",
    "Almost there…",
  ],

  emptyLeaderboard: "Be the first to play.",
  yourOwnQuizBlocked: "This is your own quiz — share it with a friend instead.",
  quizNotLiveYet: (name: string) => `${name} hasn't finished setting up their quiz yet.`,
  quizNotFound: "Couldn't find that quiz. The link may be wrong.",

  copyLinkDone: "Link copied",
  shareFallback: "Share this link with a friend",

  homeHeroCreate: "Create your quiz",
  homeHeroDashboard: "Go to your dashboard",
  homeHint: "See how well your friends actually know you.",

  usernameChangeLabel: "Username",
  usernameChangeCta: "Save",
  usernameChangeSuccess: "Username updated",

  soundToggleOn: "Sound on",
  soundToggleOff: "Sound off",

  noQuizzesAnsweredYet: "You haven't answered anyone's quiz yet.",
  noAnswersYet: "Nobody has answered your quiz yet.",

  followupPlaceholderPlace: (kind: string) => `${kind} name`,
  followupPlaceholderClass: "Class / Year / Department",
};

export function friendshipCaption(template: string | null, name: string, percentage: number): string {
  if (!template) return `I scored ${percentage}% on ${name}'s friendship quiz!`;
  return template.replaceAll("{percentage}", String(percentage)).replaceAll("{name}", name);
}
