-- =====================================================================
-- FRIENDSHIP QUIZ APP — SUPPLEMENTARY MIGRATION
-- =====================================================================
-- Your original schema (supabase_schema.sql) is genuinely solid — the
-- profile/device split, recovery-code login, anti-cheat, RLS and
-- scoring were all already correct. This migration does NOT rewrite
-- any of that. It only:
--
--   1. Sets questions_per_quiz to 11 (was 8/placeholder).
--   2. Replaces the 4 PLACEHOLDER questions with your real 11 + the
--      3 follow-ups, using fixed UUIDs the frontend references
--      directly (see src/lib/copy.ts -> QUESTION_IDS).
--   3. Fixes real "Rank" (11 named tiers) thresholds/labels into
--      level_thresholds (level_type='creator_level') — this reuses
--      your existing current_level/compute_level machinery untouched.
--      "Level" (the separate, uncapped 1/friend counter shown as
--      "Level 15" etc. in the brief) needs NO new column — it's just
--      unique_participants_count + 1, computed wherever it's shown.
--   4. Extends get_triggered_followup() with one new OR-branch so a
--      follow-up can be "always shown after its parent" (question 1's
--      "where do they study/work" follow-up isn't conditional on a
--      specific answer, unlike questions 3 and 7's follow-ups) —
--      100% backward compatible, existing trigger_condition shapes
--      are untouched.
--   5. Adds the ONE thing genuinely missing end-to-end: something
--      that actually INSERTs into notifications. Your schema had the
--      table + RLS + grants but nothing populated it yet.
--   6. Adds regenerate_recovery_code() for "I lost my code."
--
-- Safe to re-run (same idempotent style as your original file).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) questions_per_quiz -> 11
-- ---------------------------------------------------------------------
insert into app_settings (key, value, description)
values ('questions_per_quiz', '11', 'How many CORE questions make up one quiz (follow-ups do not count toward this).')
on conflict (key) do update set value = excluded.value;

-- ---------------------------------------------------------------------
-- 2) Real 11 questions + 3 follow-ups, fixed UUIDs.
-- Deletes any existing rows first (safe pre-launch — will fail loudly
-- via the ON DELETE RESTRICT foreign keys if real creator_answers or
-- participant_answers already reference them, which is the correct,
-- safe failure mode rather than silently orphaning data).
-- ---------------------------------------------------------------------
delete from question_options;
delete from questions;

-- Q1 — text, with one compound follow-up (School/College/Work/Other +
-- place name + class/year, all captured on the SAME follow-up answer
-- row — see the app-builder brief in README for why).
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-000000000001', 'Who is [Name]''s crush?', 'text', 1, 1);

insert into questions (id, question_text, answer_type, points, display_order, parent_question_id, trigger_condition) values
  ('00000000-0000-4000-8000-0000000000f1', 'Where does [Name]''s crush study or work?', 'multiple_choice', 1, null,
   '00000000-0000-4000-8000-000000000001', jsonb_build_object('always', true));
insert into question_options (question_id, option_text, display_order) values
  ('00000000-0000-4000-8000-0000000000f1', 'School', 1),
  ('00000000-0000-4000-8000-0000000000f1', 'College', 2),
  ('00000000-0000-4000-8000-0000000000f1', 'Work', 3),
  ('00000000-0000-4000-8000-0000000000f1', 'Other', 4);

-- Q2
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-000000000002', 'What is [Name]''s favourite season?', 'multiple_choice', 1, 2);
insert into question_options (question_id, option_text, display_order) values
  ('00000000-0000-4000-8000-000000000002', 'Summer', 1),
  ('00000000-0000-4000-8000-000000000002', 'Winter', 2),
  ('00000000-0000-4000-8000-000000000002', 'Monsoon', 3),
  ('00000000-0000-4000-8000-000000000002', 'Spring', 4);

-- Q3 — yes/no, with a text follow-up on "yes"
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-000000000003', 'Is [Name] in a relationship right now?', 'yes_no', 1, 3);
insert into questions (id, question_text, answer_type, points, display_order, parent_question_id, trigger_condition) values
  ('00000000-0000-4000-8000-0000000000f3', 'Who are they dating?', 'text', 1, null,
   '00000000-0000-4000-8000-000000000003', jsonb_build_object('trigger_values', jsonb_build_array('yes')));

-- Q4
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-000000000004', 'Is [Name] looking for a relationship right now?', 'yes_no', 1, 4);

-- Q5
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-000000000005', 'What kind of relationship would [Name] want?', 'multiple_choice', 1, 5);
insert into question_options (question_id, option_text, display_order) values
  ('00000000-0000-4000-8000-000000000005', 'Serious relationship', 1),
  ('00000000-0000-4000-8000-000000000005', 'Casual dating', 2),
  ('00000000-0000-4000-8000-000000000005', 'Just talking for now', 3),
  ('00000000-0000-4000-8000-000000000005', 'Not interested in dating', 4);

-- Q6
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-000000000006', 'What kind of person does [Name] like?', 'multiple_choice', 1, 6);
insert into question_options (question_id, option_text, display_order) values
  ('00000000-0000-4000-8000-000000000006', 'Sweet & caring', 1),
  ('00000000-0000-4000-8000-000000000006', 'Funny & fun', 2),
  ('00000000-0000-4000-8000-000000000006', 'Smart & ambitious', 3),
  ('00000000-0000-4000-8000-000000000006', 'Confident & bold', 4);

-- Q7 — yes/no, with an mcq follow-up on "yes"
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-000000000007', 'Has [Name] ever been in a relationship before?', 'yes_no', 1, 7);
insert into questions (id, question_text, answer_type, points, display_order, parent_question_id, trigger_condition) values
  ('00000000-0000-4000-8000-0000000000f7', 'How many relationships have they had?', 'multiple_choice', 1, null,
   '00000000-0000-4000-8000-000000000007', jsonb_build_object('trigger_values', jsonb_build_array('yes')));
insert into question_options (question_id, option_text, display_order) values
  ('00000000-0000-4000-8000-0000000000f7', '1', 1),
  ('00000000-0000-4000-8000-0000000000f7', '2', 2),
  ('00000000-0000-4000-8000-0000000000f7', '3 or more', 3);

-- Q8
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-000000000008', 'What is [Name] like when they are in love?', 'multiple_choice', 1, 8);
insert into question_options (question_id, option_text, display_order) values
  ('00000000-0000-4000-8000-000000000008', 'Very romantic', 1),
  ('00000000-0000-4000-8000-000000000008', 'Quiet but caring', 2),
  ('00000000-0000-4000-8000-000000000008', 'Fun & playful', 3),
  ('00000000-0000-4000-8000-000000000008', 'Protective & possessive', 4);

-- Q9
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-000000000009', 'What does [Name] notice first in someone?', 'multiple_choice', 1, 9);
insert into question_options (question_id, option_text, display_order) values
  ('00000000-0000-4000-8000-000000000009', 'Looks', 1),
  ('00000000-0000-4000-8000-000000000009', 'Personality', 2),
  ('00000000-0000-4000-8000-000000000009', 'Intelligence', 3),
  ('00000000-0000-4000-8000-000000000009', 'Lifestyle', 4);

-- Q10
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-00000000000a', 'What does [Name] dislike the most in a person?', 'multiple_choice', 1, 10);
insert into question_options (question_id, option_text, display_order) values
  ('00000000-0000-4000-8000-00000000000a', 'Rude behavior', 1),
  ('00000000-0000-4000-8000-00000000000a', 'No goals in life', 2),
  ('00000000-0000-4000-8000-00000000000a', 'Too much jealousy', 3),
  ('00000000-0000-4000-8000-00000000000a', 'Always on their phone', 4);

-- Q11
insert into questions (id, question_text, answer_type, points, display_order) values
  ('00000000-0000-4000-8000-00000000000b', 'What taste does [Name] like the most?', 'multiple_choice', 1, 11);
insert into question_options (question_id, option_text, display_order) values
  ('00000000-0000-4000-8000-00000000000b', 'Sweet', 1),
  ('00000000-0000-4000-8000-00000000000b', 'Spicy', 2),
  ('00000000-0000-4000-8000-00000000000b', 'Sour', 3),
  ('00000000-0000-4000-8000-00000000000b', 'Salty', 4),
  ('00000000-0000-4000-8000-00000000000b', 'Bitter', 5);

-- ---------------------------------------------------------------------
-- 3) Rank (11 named tiers) — reuses existing current_level/
-- compute_level machinery, just replaces the placeholder numbers.
-- level 0 is intentionally unused (creator_level starts the ladder at
-- "Known" = 0 friends) so current_level lines up 1:1 with the 11 named
-- tiers instead of a phantom "level 0 below Known".
-- ---------------------------------------------------------------------
delete from level_thresholds where level_type = 'creator_level';
insert into level_thresholds (level_type, level, min_count, label) values
  ('creator_level', 1,  0,  'Known'),
  ('creator_level', 2,  1,  'Familiar'),
  ('creator_level', 3,  3,  'Connected'),
  ('creator_level', 4,  6,  'Insider'),
  ('creator_level', 5,  10, 'Trusted'),
  ('creator_level', 6,  15, 'Confidant'),
  ('creator_level', 7,  21, 'Kindred'),
  ('creator_level', 8,  28, 'Inner Circle'),
  ('creator_level', 9,  36, 'Rare'),
  ('creator_level', 10, 43, 'Iconic'),
  ('creator_level', 11, 50, 'Unforgettable');

-- ---------------------------------------------------------------------
-- 4) get_triggered_followup — add an "always" trigger shape, needed
-- for Q1's follow-up (unconditional after a free-text parent, so it
-- can't be matched by trigger_option_ids or trigger_values). Fully
-- additive: existing trigger_condition shapes behave identically.
-- ---------------------------------------------------------------------
create or replace function get_triggered_followup(
  p_parent_question_id uuid,
  p_selected_option_id uuid,
  p_answer_text text
)
returns uuid
language sql
stable
as $$
  select f.id
  from questions f
  where f.parent_question_id = p_parent_question_id
    and f.is_active = true
    and (
      (p_selected_option_id is not null and f.trigger_condition -> 'trigger_option_ids' ? p_selected_option_id::text)
      or
      (p_answer_text is not null and f.trigger_condition -> 'trigger_values' ? lower(trim(p_answer_text)))
      or
      (f.trigger_condition ? 'always' and (f.trigger_condition ->> 'always')::boolean is true)
    )
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- 5) Notification generation — the one real gap in the original file.
-- Fires after any INCREASE in a quiz's unique_participants_count
-- (i.e. exactly when a genuinely new person finishes that quiz).
-- Notification text/labels themselves live in the frontend
-- (src/lib/copy.ts), keyed by notification_type + payload.
-- ---------------------------------------------------------------------
alter table notifications drop constraint if exists notifications_notification_type_check;
alter table notifications add constraint notifications_notification_type_check
  check (notification_type in (
    'new_participant',  -- "👀 Someone answered your quiz"
    'rank_up',          -- "🏆 Your rank went up"
    'close_rank',       -- "🔥 Someone is close to your rank"
    'close_level',      -- "⚡ Someone is close to your level"
    'passed_you',       -- "🚨 Someone passed you"
    'level_tease',      -- "🎯 1 more friend → Level [X]"
    'level_milestone'   -- "🚀 You reached Level [X]!"
  ));

create or replace function trg_generate_leaderboard_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator_id       uuid := new.creator_id;
  v_old_count        int  := coalesce(old.unique_participants_count, 0);
  v_new_count        int  := new.unique_participants_count;
  v_new_level        int;
  v_new_rank_name    text;
  v_old_rank_name    text;
  v_new_global_rank  int;
  v_old_global_rank  int;
  v_passed_profile   uuid;
  v_above_gap        int;
  v_rank_gap         int;
begin
  if v_new_count <= v_old_count then
    return null; -- only fires on real growth, never on a decrement/no-op
  end if;

  -- 1) always: someone answered your quiz
  insert into notifications (recipient_profile_id, notification_type, payload)
  values (v_creator_id, 'new_participant', jsonb_build_object('unique_participants_count', v_new_count));

  -- 2) named-tier Rank crossed a threshold?
  v_new_rank_name := compute_level_label('creator_level', v_new_count);
  v_old_rank_name := compute_level_label('creator_level', v_old_count);
  if v_new_rank_name is distinct from v_old_rank_name then
    insert into notifications (recipient_profile_id, notification_type, payload)
    values (v_creator_id, 'rank_up', jsonb_build_object('rank_name', v_new_rank_name));
  end if;

  -- 3) open-ended Level (count + 1): big celebration every 3rd level
  -- starting at 2 (2, 5, 8, 11, ...), a small forward-looking tease
  -- otherwise — see README for why this pairing was chosen.
  v_new_level := v_new_count + 1;
  if v_new_level >= 2 and (v_new_level - 2) % 3 = 0 then
    insert into notifications (recipient_profile_id, notification_type, payload)
    values (v_creator_id, 'level_milestone', jsonb_build_object('level', v_new_level));
  else
    insert into notifications (recipient_profile_id, notification_type, payload)
    values (v_creator_id, 'level_tease', jsonb_build_object('next_level', v_new_level + 1));
  end if;

  -- 4) global rank before/after (comparing against every OTHER quiz's
  -- CURRENT count is valid here because only THIS row changed in this
  -- transaction) -> notify whoever just got overtaken.
  select count(*) + 1 into v_new_global_rank from quizzes q2
    where q2.id <> new.id and q2.unique_participants_count > v_new_count;
  select count(*) + 1 into v_old_global_rank from quizzes q2
    where q2.id <> new.id and q2.unique_participants_count > v_old_count;

  if v_new_global_rank < v_old_global_rank then
    select creator_id into v_passed_profile from quizzes q2
      where q2.id <> new.id
      order by q2.unique_participants_count desc
      offset (v_old_global_rank - 1) limit 1;
    if v_passed_profile is not null and v_passed_profile <> v_creator_id then
      insert into notifications (recipient_profile_id, notification_type, payload)
      values (v_passed_profile, 'passed_you', jsonb_build_object('by_profile_id', v_creator_id));
    end if;
  end if;

  -- 5) close_level: raw gap to whoever's directly above in the
  -- global ranking is small.
  select (q2.unique_participants_count - v_new_count) into v_above_gap
    from quizzes q2
    where q2.unique_participants_count > v_new_count
    order by q2.unique_participants_count asc limit 1;
  if v_above_gap is not null and v_above_gap <= 2 then
    insert into notifications (recipient_profile_id, notification_type, payload)
    values (v_creator_id, 'close_level', jsonb_build_object('gap', v_above_gap));
  end if;

  -- 6) close_rank: same idea, but only when that gap would also cross
  -- one of the 11 NAMED rank thresholds (a more meaningful signal).
  select min(min_count) - v_new_count into v_rank_gap
    from level_thresholds
    where level_type = 'creator_level' and min_count > v_new_count;
  if v_rank_gap is not null and v_rank_gap <= 2 then
    insert into notifications (recipient_profile_id, notification_type, payload)
    values (v_creator_id, 'close_rank', jsonb_build_object('gap', v_rank_gap, 'rank_name', v_new_rank_name));
  end if;

  return null;
end;
$$;

-- Small helper used above — same lookup as compute_level() but
-- returns the human label instead of the integer level.
create or replace function compute_level_label(p_level_type text, p_count int)
returns text
language sql
stable
as $$
  select label
  from level_thresholds
  where level_type = p_level_type
    and min_count <= p_count
  order by min_count desc
  limit 1;
$$;

drop trigger if exists trg_generate_leaderboard_notifications on quizzes;
create trigger trg_generate_leaderboard_notifications
  after update of unique_participants_count on quizzes
  for each row execute function trg_generate_leaderboard_notifications();

grant execute on function compute_level_label(text, int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6) "I lost my recovery code" — issues a fresh one (invalidates the
-- old one), same one-time-plaintext-return pattern as create_my_profile.
-- ---------------------------------------------------------------------
create or replace function regenerate_recovery_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := current_profile_id();
  v_code text;
begin
  if v_profile_id is null then
    raise exception 'No profile linked to this session yet';
  end if;
  v_code := generate_recovery_code();
  update profiles set recovery_code_hash = crypt(v_code, gen_salt('bf')), updated_at = now()
  where id = v_profile_id;
  return v_code;
end;
$$;

grant execute on function regenerate_recovery_code() to authenticated;

-- ---------------------------------------------------------------------
-- 7) get_my_profile() — a single, unambiguous "who am I" call for the
-- frontend (bypasses any doubt about which profiles columns are
-- directly select-granted to anon/authenticated for arbitrary rows;
-- this only ever returns the CALLER's own row via current_profile_id()).
-- Returns null (not an error) if this session hasn't named itself yet.
-- ---------------------------------------------------------------------
create or replace function get_my_profile()
returns profiles
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.* from profiles p where p.id = current_profile_id();
$$;

grant execute on function get_my_profile() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8) One real hardening gap in the original grants: `grant select on
-- profiles to anon, authenticated` (PART 13) is table-wide, so
-- recovery_code_hash — a bcrypt hash, not the plaintext, but still a
-- credential — is technically fetchable by anyone via the REST API.
-- Nothing in this app ever legitimately needs to SELECT that column
-- (comparisons happen server-side inside claim_existing_profile /
-- regenerate_recovery_code), so this narrows it at zero functional
-- cost, the same pattern already used for participations' fingerprint/
-- ip/user_agent columns.
-- ---------------------------------------------------------------------
revoke select (recovery_code_hash) on profiles from anon, authenticated;

commit;

-- =====================================================================
-- MANUAL STEPS FOR THIS MIGRATION (see README.md for full context)
-- =====================================================================
-- Everything your original file's "MANUAL STEPS" comment said still
-- applies (anonymous sign-in ON, Realtime ON for participations).
-- Additionally, for push notifications to actually fire when the
-- screen is closed, see README.md -> "Push notifications" for the
-- Database Webhook you need to add pointing at /api/send-push.
-- =====================================================================
