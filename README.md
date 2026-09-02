# Friend Quiz

A Next.js + Supabase app: everyone gets one quiz about themselves, friends
answer it, get ranked, and get pushed to make their own.

This README is the long version of everything below. Read **Quick Start**
first — that's the only part you strictly need to go live.

---

## Quick start

1. **Install**
   ```bash
   npm install
   ```

2. **Run the database migration.** Your original schema is untouched — this
   adds the real 11 questions, fixes the rank/level data, and adds
   notification generation. Open the Supabase SQL Editor for your project
   and run the file at:
   ```
   supabase/migrations/20260901000000_app_content_and_notifications.sql
   ```
   (This is in addition to your original `supabase_schema.sql`, which you've
   presumably already run — if not, run that one first.)

3. **Turn on Anonymous Sign-ins.** Supabase dashboard → Authentication →
   Sign In / Providers → enable **Anonymous Sign-ins**. Without this, nothing
   in the app works (every RPC requires `auth.uid()` to be set).

4. **Turn on Realtime for `participations`.** Dashboard → Database →
   Replication → toggle the `participations` table on. This powers the live
   leaderboard updates (`quiz_leaderboard` reads from this table).

5. **Environment variables.** `.env.local` is already filled in with your
   real Supabase URL/anon key plus a real, generated VAPID keypair for push
   notifications (see below). It's gitignored — **don't drag it into
   GitHub's web uploader**, that bypasses `.gitignore`. If you use `git`
   normally (`git add` / `git push`), you're safe automatically.

6. **Run it**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

7. **Deploy.** Any Next.js host works (Vercel is the path of least
   resistance). Copy the same env vars from `.env.local` into your host's
   environment variable settings — do not commit them.

8. **Push notifications** need one more step to actually fire when the app
   is closed — see [Push notifications](#push-notifications) below. Everything
   else works without it.

That's it for "does it run." Everything after this point is context, not
more setup.

---

## What I didn't build myself — and why that matters

You uploaded `supabase_schema.sql`, and I read all 1,659 lines of it before
writing anything. It's genuinely well-built: the `profile_auth_links` table
already solves "log in on another phone without a password" correctly (see
below), anti-cheat is handled with layered checks, scoring runs entirely
server-side so the browser never sees correct answers before you've played,
and RLS is applied thoughtfully throughout.

So I didn't rewrite it. I wrote one small **supplementary migration**
(`supabase/migrations/20260901000000_app_content_and_notifications.sql`)
that:
- Replaces the 4 placeholder questions with your real 11 (+ 3 follow-ups)
- Fixes the Rank thresholds/names from placeholders to your real 11 tiers
- Adds the one genuinely missing piece: nothing in the original file ever
  inserted a row into `notifications` — I added the trigger that does
- Extends `get_triggered_followup()` with one new case (see below)
- Closes one small privacy gap (see [Security notes](#security-notes))

Every table, RLS policy, RPC signature, and view your file already had is
used by the frontend exactly as you wrote it.

---

## How the login-without-a-password problem was solved

You asked me to think through this explicitly, so here's the answer built
into the app:

**The account (`profiles.id`) is a separate, stable identifier from "which
browser session currently controls it."** A table called
`profile_auth_links` maps *Supabase anonymous session → profile*. Signing in
on a new phone creates a *new* anonymous session automatically (no
password), and:

- **New person, first time**: they play a quiz, type their name once, and
  `create_my_profile()` creates the profile, generates a random 8-character
  recovery code (skips confusing characters like `0`/`O`/`1`/`I`), stores
  only a **bcrypt hash** of it, and returns the plaintext to the browser
  exactly once. The app shows it on their first dashboard visit, expanded
  and highlighted, then collapses it to a small masked badge from then on —
  tap the eye icon to reveal, tap copy to grab it. That's the "shown on top,
  not easily visible" behavior you described.

- **Same person, new phone**: "Already answered a quiz before? Log in" →
  username + recovery code → `claim_existing_profile()` checks the code
  against the stored hash **server-side** (the hash never leaves the
  database) and, if it matches, re-points that phone's fresh anonymous
  session at the existing profile. Every screen after that reads "who am I"
  by asking "which profile is *my current session* linked to" — so it just
  works, no client-side profile-ID bookkeeping needed.

This directly satisfies the constraint you were worried about: **knowing
someone's public `@username` alone is not enough to log in as them** — you
also need the recovery code, which only the real account holder ever saw.

One deliberate side effect: logging in on a new phone re-points the link, so
the *old* phone's session stops resolving to that profile (it isn't deleted,
it just no longer matches). This is standard "signing in elsewhere signs you
out elsewhere" behavior, not a bug.

If someone loses their code, "Lost it? Get a new one" issues a fresh one and
invalidates the old one (`regenerate_recovery_code()`).

---

## Design direction

You asked for the reasoning, not just the result, so here it is briefly —
full rationale lives as comments in `src/app/globals.css`.

- **Dark void background (`#0B0A18`)** rather than a busy background so a
  *small* set of accent colors can each mean one specific thing instead of
  competing for attention. This is deliberate: color that means something
  works harder than color that's just decoration.
- **One neon gradient (violet → magenta → orange)** for anything tappable.
  Never used for anything else — so when it appears, your eye already knows
  "this is the action."
- **Gold, used only for #1 / crowns / top rank.** Scarcity is what makes a
  color read as "special." If gold showed up everywhere it would just be
  another color.
- **Mint, used only for growth** — milestones, level-ups, positive motion.
  Deliberately a *different* positive color from gold, because "you're
  ranked well" and "you just made progress" are different feelings and
  deserve different signals.
- **Coral, used sparingly for urgency** ("someone passed you") — warm
  rather than alarm-red, so it reads as exciting, not threatening, matching
  the "funny, never humiliating" tone the brief asked for elsewhere.
- **Glassmorphism panels** (blurred, translucent, thin light border) so
  panels read as layered depth against the void rather than flat cards —
  this is what makes it feel premium/gamified rather than like a form.
- **Three-font system**: Space Grotesk for headlines (geometric, a little
  playful — fits a gamified app without looking like a kids' app),
  Inter for body copy (gets out of the way), and JetBrains Mono
  specifically for **numbers** (scores, ranks, percentages) — tabular
  figures give that "live scoreboard" feel and stop digits from jittering
  in width as they animate.
- **Motion has a job, not just decoration**: staggered leaderboard entrance,
  spring count-up on scores, a slow (not twitchy) pulse on the one primary
  CTA per screen, a real particle burst only on genuinely good scores/level
  milestones — so it stays a reward signal instead of becoming noise.
- **Sound is synthesized, not sampled** (`src/lib/sound.ts`, Web Audio
  oscillators) — no external audio files to license or fetch, and it means
  the whole app works offline-of-CDN. Muteable, defaults to on per your
  request for delight.

---

## Decisions I made where the brief was ambiguous or contradicted itself

You explicitly invited me to resolve these rather than block on them, so
here's the full list of judgment calls, in case you want to change any:

1. **"Friends" count** — you explicitly resolved this yourself mid-brief:
   unique participants only, never shares. Implemented exactly that way
   everywhere (`quiz.unique_participants_count`), including the "Friends who
   opened your quiz" dashboard line, even though that specific label says
   "opened" — I treated that as informal phrasing, not a different metric,
   since a separate opens-based number would reintroduce the exact
   inflation risk you asked me to avoid.

2. **Level vs. Rank** — the brief describes two different progressions
   (named tiers *and* an open-ended numbered level) without fully
   reconciling them. I made them two views of the same one number
   (`unique_participants_count`) so they can never disagree:
   - **Rank** = your 11 named tiers (Known → Unforgettable), your exact
     thresholds.
   - **Level** = `friends + 1`, uncapped. Both worked examples you gave
     ("1 friend → Level 2", "1 more friend → Level 16") are consistent with
     a flat +1 relationship, so that's what's implemented.

3. **"🎯 1 more friend → Level [X]" notification** — under a strict +1
   formula this is almost always trivially true right after any level-up,
   so I implemented it as the notification you get on every level-up that
   *isn't* a 3-level milestone (2, 5, 8, 11...) — the milestone notification
   fires on those instead. This way every level-up produces exactly one
   notification, never zero, never two.

4. **Question 1's follow-up** — your original schema enforces "follow-ups
   are exactly one level deep" (a real trigger, `trg_single_level_followup`)
   for good reasons (keeps the data model simple, prevents runaway
   branching). Question 1 as you wrote it has three parts (crush's name →
   where they study/work → place name + class/year). Rather than removing
   that safety trigger, I collapsed the second and third parts into **one**
   follow-up question whose answer captures both the picked category and
   the free-text place/class info together. Still one question conceptually
   from the person's point of view; still one level deep in the database.

5. **Follow-up bonus scoring** — follow-ups add to `bonus_score` (tracked
   separately from `core_score`, per your original schema's own comment
   explaining why: not every participant triggers the same follow-ups, so
   they can't fairly affect the ranked score). They still count toward
   *your* percentage/leaderboard number the same way core questions do
   only through `core_score` — bonus points are extra, not required, and
   don't skew rank.

6. **Tie-break rule** — you left this open ("decided later in code"). Your
   schema author picked "earliest to reach that score wins," which I kept.
   It's isolated to one `ORDER BY` clause in the `quiz_leaderboard` view if
   you want to change it later.

7. **Share caption tone-by-score** — the brief's exact wording is locked for
   every on-screen string, but didn't give exact text for the *shareable
   image* captions (separate from the on-screen result heading). Those come
   from your schema's own `friendship_tiers.share_caption_template` values,
   which are genuinely well-written — I left them as-is rather than
   inventing my own.

8. **Global Rank #27-style screen** — your schema's `creator_rankings` view
   has two different rankings: `global_rank` (bucketed by the 11-tier Rank
   first, count as tiebreak) and `popularity_rank` (pure count, fine-grained).
   The brief's worked example (`#25 Aisha, #26 Arjun, #27 Rahul...` — distinct
   neighbors, not big ties) only makes sense against the fine-grained one, so
   the "Your Global Rank" screens use `popularity_rank` throughout, despite
   the more generic-sounding column name on the *other* one.

---

## Known, deliberate trade-offs

- **`push_token` is technically readable via the public API.** Your schema
  already applies this same "lock down sensitive columns" pattern to
  `participations` (fingerprint/IP/user-agent are correctly revoked) — I
  didn't extend it to `push_token` because doing so would also block my own
  `/api/send-push` route from reading it, since neither of us has a Supabase
  **service-role** key (you only gave me the publishable/anon key). If you
  add a service-role key later, revoke public `select` on `push_token` and
  switch `/api/send-push` to use the service-role client instead — strictly
  better, not required for the app to work.
- **`participant_answers.is_correct` is technically readable by the person
  who answered**, if they open dev tools and query the table directly — the
  UI never shows this to them (only the creator's drill-down does), but the
  grant is table-wide because the same table serves both the creator's
  analytics and the participant's own resume-in-progress flow. Fixing this
  fully would mean adding a masking view; flagged here rather than silently
  left as a surprise.
- **Leaderboard-proximity notifications** ("someone is close to your
  rank/level", "someone passed you") are computed with reasonable
  heuristics inside one Postgres trigger (see the migration file's comments)
  rather than a full historical-rank ledger. They'll be right in the common
  case (one person's count changing at a time, which is how the app always
  behaves) but are worth watching once you have real traffic.
- **I could not run `npm install` or `npm run build`** in the sandbox I
  wrote this in (no network access there). I searched for current package
  versions before pinning them and re-read the actual RPC signatures in
  your file line-by-line rather than working from memory, but the first
  real build on your machine is still the actual test — if anything breaks,
  it's most likely one dependency version needing a bump, not the app logic.

---

## Push notifications

Two separate things need to both be true for a push to actually arrive:

**1) The browser needs a subscription.** Already wired up — tapping "Turn on
notifications" on the dashboard calls the browser's push API and saves the
subscription onto `profiles.push_token`.

**2) Something needs to actually send it when a `notifications` row is
created.** This is the part that needs your Supabase project specifically,
which I can't reach from here. Two steps:

1. In the Supabase Dashboard → Database → Webhooks → **Create a new hook**:
   - Table: `notifications`, Event: `Insert`
   - Type: `HTTP Request`, Method: `POST`
   - URL: `https://<your-deployed-domain>/api/send-push`
   - Headers: add `x-webhook-secret: <the PUSH_WEBHOOK_SECRET value from your .env.local>`
2. Make sure `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and
   `PUSH_WEBHOOK_SECRET` are set as environment variables on your **deployed**
   host (Vercel/etc.), not just locally.

The VAPID keypair in `.env.local` is real (generated locally with Node's
built-in `crypto` module, not a placeholder) — you can use it as-is or
rotate it any time; rotating just means everyone has to re-subscribe.

---

## Project structure

```
supabase/migrations/     one supplementary SQL file — see above
src/lib/                 Supabase clients, types, all copy/text, rank+level
                          math, sound, fingerprinting
src/components/          design-system primitives + feature components
src/app/
  q/[slug]/               Screens 1–3: landing, quiz, name entry, reveal, result
  create/                 the 11-question self-answer flow that publishes your quiz
  dashboard/               Screen 4 + rank/level/analytics sub-screens
  login/                   recovery-code login
  profile/[username]/      public profile
  rankings/                global leaderboard
  api/                     start-participation (IP capture proxy),
                            send-push (webhook target)
```

`src/lib/copy.ts` is the single source of truth for every user-facing
string — sections marked `VERBATIM` are the brief's exact wording and
shouldn't be reworded; everything under `EDITABLE` is mine and safe to
change freely.
