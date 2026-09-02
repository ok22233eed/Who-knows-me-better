// Mirrors the actual Supabase schema (supabase/migrations). Field names
// match the real columns exactly — e.g. profiles.name (not display_name),
// quizzes.slug (not profiles.quiz_slug) — so keep this in sync with SQL,
// not with any earlier paraphrased description of the schema.

export type AnswerType = "multiple_choice" | "text" | "yes_no";

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  display_order: number | null;
}

export interface Question {
  id: string;
  question_text: string;
  answer_type: AnswerType;
  points: number;
  display_order: number | null;
  parent_question_id: string | null;
  trigger_condition: { trigger_values?: string[]; trigger_option_ids?: string[]; always?: boolean } | null;
  is_active: boolean;
}

export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
  followup: QuestionWithOptions | null;
}

export interface Profile {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  current_level: number; // 1..11, the named Rank tier index
  friend_collector_count: number;
  friend_collector_level: number;
  push_notifications_enabled: boolean;
  push_token: string | null;
  notification_permission_asked_at: string | null;
  created_at: string;
}

export interface Quiz {
  id: string;
  creator_id: string;
  slug: string;
  is_live: boolean;
  published_at: string | null;
  link_opens_count: number;
  quiz_starts_count: number;
  completions_count: number;
  unique_participants_count: number;
  total_shares_count: number;
  created_at: string;
}

export type ParticipationStatus = "in_progress" | "completed";

export interface Participation {
  id: string;
  quiz_id: string;
  session_auth_id: string;
  participant_id: string | null;
  status: ParticipationStatus;
  core_score: number | null;
  bonus_score: number | null;
  max_core_score: number | null;
  friendship_tier: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface LeaderboardRow {
  participation_id: string;
  quiz_id: string;
  participant_id: string;
  participant_name: string;
  participant_username: string;
  participant_avatar_url: string | null;
  core_score: number;
  bonus_score: number;
  max_core_score: number;
  friendship_tier: string | null;
  completed_at: string;
  rank: number;
}

export interface CreatorRankingRow {
  profile_id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  current_level: number;
  friend_collector_level: number;
  unique_participants_count: number;
  crowns_count: number;
  global_rank: number;
  popularity_rank: number;
}

export type NotificationType =
  | "new_participant"
  | "rank_up"
  | "close_rank"
  | "close_level"
  | "passed_you"
  | "level_tease"
  | "level_milestone";

export interface AppNotification {
  id: string;
  recipient_profile_id: string;
  notification_type: NotificationType;
  payload: Record<string, unknown>;
  group_key: string | null;
  is_read: boolean;
  created_at: string;
}

export interface CompleteParticipationResult {
  core_score: number;
  bonus_score: number;
  max_core_score: number;
  percentage: number;
  friendship_tier: string;
  share_caption_template: string | null;
}

export interface CreateProfileResult {
  profile_id: string;
  username: string;
  quiz_slug: string;
  recovery_code: string;
}
