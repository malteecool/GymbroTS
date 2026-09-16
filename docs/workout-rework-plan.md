# Workout Rework Plan — Popular Workouts & Ratings

Reworks the "New workout" flow (`app/workout/addWorkout.tsx`) so instead of picking
between admin-seeded "default workouts" and building a custom one, users can browse
public workouts shared by the community (sorted by followers/rating) or build their
own from scratch.

This is a continuation of **`docs/social-features-plan.md` Phase 4**, not a new
system. Phase 4 already shipped `is_public`, `copy_count`, `link_type`
(`copy`/`follow`), `source_workout_id`, and the sync-on-follow mechanism — it
explicitly left two things undone, which this plan finishes:
> - Explore page sorted by popularity across all users (not built — no global feed yet)
> - Preview a template's exercises before copying (not built)

...plus a new piece Phase 4 didn't cover: ratings.

Status legend: `[ ]` not started, `[~]` in progress, `[x]` done.

## Status: Code complete (Phases A–D), migration applied, awaiting device verification

All application code for Phases A–D is written and type-checks cleanly.

1. **Migration** — ✅ applied by the user to the live Supabase database
   (`follower_count`/`avg_rating`/`rating_count` columns, `workout_rating` table).
2. **One-time data fix** — still outstanding:
   `UPDATE workout SET is_public = true WHERE wor_user_id IS NULL`, so the old
   admin-seeded "default workouts" actually appear in Browse Popular (Decision #1).
   Data change, not schema, so it wasn't part of the migration — run it whenever
   convenient, not urgent for testing the rest of the flow.

Every Acceptance Criteria checkbox across all four phases is still unchecked — nothing
has been exercised against the live DB yet. That's the only thing left: a real
device/emulator run through Browse → Copy/Follow → Complete → Rate → verify counts.

---

## Current State (reference)

- **`app/workout/addWorkout.tsx`** — two tabs: "Default workout" (`getDefaultWorkouts()`,
  workouts where `wor_user_id IS NULL`) and "Custom workout" (`CustomAddWorkout`
  component — name + pick exercises, from `components/ui/CustomAddWorkout.tsx`).
- **`services/WorkoutService.Service.ts`** already has the per-profile sharing
  primitives we'll reuse: `getPublicWorkouts(userId)`, `copyWorkout(sourceId, targetUserId)`,
  `linkWorkout(sourceId, targetUserId)` (follow — clones + keeps exercise list synced
  via `syncLinkedWorkout`), `unlinkWorkout`, `toggleWorkoutVisibility`.
- **`app/social/userWorkouts.tsx`** is the only existing place to browse public
  workouts today, and only for one profile at a time — no global/cross-user feed.
- **No follower count and no rating exist yet.** `copy_count` exists but only counts
  one-time copies, not people actively following (sync-linked to) a workout.
- `Workout` interface (`interfaces/Workout.Interface.ts`) already has `isPublic`,
  `sourceWorkoutId`, `linkType`, `copyCount`.

---

## Decisions (confirmed)

1. **Existing "default workouts" (`wor_user_id IS NULL`)** — left as-is, surfaced in
   the new Browse Popular feed like any other public workout (NULL-owner treated as a
   de-facto "official" account, `is_public = true`). No data migration.
2. **"Most Followed" sort** — tracks `follower_count`, which counts only
   `link_type='follow'` clones (people actively following, kept in sync). `copy_count`
   (one-time duplicates) stays a separate, distinct counter — the two are never
   conflated. Two sort options ship: Most Followed, Highest Rated.
3. **Rating scope** — any workout with a `sourceWorkoutId` set, i.e. both `copy` and
   `follow` types prompt for a rating on completion. A from-scratch custom workout
   never prompts (nothing to rate).
4. **Re-rating** — one rating per (user, source workout); re-rating upserts the
   existing row rather than creating a duplicate.
5. **Own-workout rating** — blocked. Skip the rating prompt when the source workout's
   owner is the current user.

---

## Phase A — Data model: follower counts + ratings

### Goals
- `workout` rows track a live follower count (people who followed, not just copied)
- A workout can be rated 0–5 by any user who has a copy/follow of it
- Aggregate rating (average + count) is cheap to read for sorting a feed

### Database Changes
```sql
-- migration/supabase-migration.sql additions — safe to re-run
ALTER TABLE workout ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workout ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2);
ALTER TABLE workout ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS workout_rating (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 0 AND 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workout_id, user_id)
);
```
`workout_rating.workout_id` always points at the **canonical source workout**
(`sourceWorkoutId`), never at an individual follower's private clone — ratings must
aggregate onto the one shared workout everyone branched from.

Recompute `avg_rating`/`rating_count` on every insert/update to `workout_rating`.
Prefer a DB trigger for correctness under concurrent writes; if that's more than we
want to take on right now, recompute client-side in the same call that upserts the
rating (read-modify-write is acceptable at this app's scale, just not race-proof).

`follower_count`: increment in `linkWorkout()`, decrement in `unlinkWorkout()` —
mirrors how `copyWorkout()` already increments `copy_count` today.

### Service Changes
- [x] `services/WorkoutService.Service.ts` — `linkWorkout` increments `follower_count`;
  `unlinkWorkout` decrements it
- [x] `services/WorkoutRatingService.Service.ts` (new) — `rateWorkout(workoutId, userId, rating)`
  (upsert), `getUserRatingForWorkout(workoutId, userId)`, recompute + persist
  `avg_rating`/`rating_count`
- [x] `interfaces/Workout.Interface.ts` — add `followerCount`, `avgRating`, `ratingCount`
- [x] Update all `Workout` row-mapping call sites in `WorkoutService.Service.ts`
  (`getWorkouts`, `getWorkoutById`, `getDefaultWorkouts`, `getPublicWorkouts`) to
  include the three new fields — extracted a shared `mapWorkoutRow` helper since all
  four call sites were duplicating the same mapping
- [x] `services/WorkoutService.Service.ts` — added `getPopularWorkouts(sortBy, limit, offset)`
  for Phase B ahead of schedule (needed the mapper helper anyway)
- [x] `migration/supabase-migration.sql` — `follower_count`/`avg_rating`/`rating_count`
  columns on `workout`, new `workout_rating` table, indexes. **Applied to the live
  database** by the user.

### Acceptance Criteria
- [ ] Following a workout increments its `follower_count`; unlinking decrements it
- [ ] Rating a workout upserts (not duplicates) a row per user
- [ ] `avg_rating`/`rating_count` reflect all submitted ratings correctly

*(Migration is applied — these just need a real device/emulator run to verify.)*

---

## Phase B — Browse Popular tab (global discovery)

### Goals
- Replace the "Default workout" tab in `addWorkout.tsx` with "Browse Popular"
- Global feed of public workouts across all users (not scoped to one profile)
- Sort/filter by Most Followed or Highest Rated
- Preview a workout's exercise list before copying/following (the other Phase-4 gap)

### Service Changes
- [x] `services/WorkoutService.Service.ts` — `getPopularWorkouts(sortBy: 'followers' | 'rating', limit, offset)`
  (built in Phase A). Author display name resolved via `getUserDataById`, deduped by
  unique `worUserId` across the fetched page (same lookup already used elsewhere, e.g.
  `workoutDetails.tsx`'s linked-workout banner)

### New/Changed Screens
- [x] `app/workout/addWorkout.tsx` — "Default workout" `TabView` route replaced with
  "Browse Popular"; `getDefaultWorkouts()` call and all its dedicated UI/styles removed
  (superseded by Decision #1 — default workouts now surface through the public pool
  instead of a separate bucket, once `is_public` is set on those rows — see note below)
- [x] `components/Workout/BrowsePopular.tsx` (new) — sort toggle (Most Followed /
  Highest Rated), list rows showing name, author, follower count, star rating,
  inline exercise-name preview, Copy/Follow actions
- [x] `components/ui/StarRating.tsx` (new) — shared read-only/interactive star
  display, reused by both this list and the Phase C rating prompt
- [x] Preview: **followed the existing precedent** from `app/social/userWorkouts.tsx`
  (inline exercise-name list in the card, e.g. "Squat · Bench · Row") rather than a
  separate preview screen/modal — Phase 4's plan had flagged a dedicated preview
  screen as not-built, but the shipped pattern for the equivalent per-profile browse
  screen is this inline version, so Browse Popular matches it for consistency
- [x] Copy / Follow actions call the existing `copyWorkout` / `linkWorkout` (Phase 4
  primitives, `linkWorkout` now also increments `follower_count` per Phase A)

### Acceptance Criteria
- [ ] "Browse Popular" tab replaces "Default workout" in the New Workout flow
- [ ] Feed shows public workouts from all users, sorted by the selected criterion
- [ ] Sort toggle switches between Most Followed and Highest Rated without a full screen reload
- [ ] Tapping Copy/Follow behaves exactly as it does today from `userWorkouts.tsx`

**Note on old default workouts:** the existing `wor_user_id IS NULL` rows won't
actually appear in Browse Popular until their `is_public` column is set to `true` —
that's a one-time data fix (`UPDATE workout SET is_public = true WHERE wor_user_id IS NULL`),
not application code. Flagging so it isn't missed; not run automatically since it's a
data change, not a schema one.

*(Migration is applied — this just needs a real device/emulator run to verify.)*

---

## Phase C — Rating prompt after completing a followed/copied workout

### Goals
- After finishing a workout that came from someone else, offer a 0–5 rating
- Don't nag: skip if already rated, skip for the workout's own author, skip for from-scratch custom workouts

### New Components
- [x] `components/Workout/RatingPrompt.tsx` — modal, same shape as
  `components/Social/WorkoutSharePrompt.tsx` (bottom sheet, Skip / Submit), five
  tappable stars (via `StarRating`) instead of a caption field

### Screen Changes
- [x] `app/workout/workoutComplete.tsx` — after loading the completed workout, if
  `workout.sourceWorkoutId` is set, fetches the **source** workout
  (`getWorkoutById(sourceWorkoutId)`) and skips the prompt if its owner is the current
  user (the clone itself is always owned by the current user, so that check is against
  the source, not the clone). Also skips if `getUserRatingForWorkout` already returns a
  rating. Otherwise shows `RatingPrompt` automatically (not gated behind a button, since
  it's already one-time/conditional) alongside the existing "Share to feed" flow. A
  "Thanks for rating!" confirmation appears after submitting, mirroring the "Shared to
  your feed" badge
- [x] Submitting calls `rateWorkout(sourceWorkoutId, userId, rating)`

### Acceptance Criteria
- [ ] Completing a followed/copied workout prompts for a rating exactly once per source workout
- [ ] Re-completing the same workout later does not re-prompt (already rated)
- [ ] Rating a workout you own is never prompted
- [ ] Submitted rating updates the source workout's `avg_rating`/`rating_count`

*(Migration is applied — this just needs a real device/emulator run to verify.)*

---

## Phase D — Show ratings everywhere workouts are listed

### Goals
- Rating/follower count visible wherever a public workout appears, not just Browse Popular

### Screen Changes
- [x] `app/social/userWorkouts.tsx` — follower count + star rating shown per row
  (data already returned by `getPublicWorkouts` via `mapWorkoutRow` from Phase A)
- [x] `app/workout/workoutDetails.tsx` — for a followed *or* copied workout (any
  `sourceWorkoutId`, not just `link_type='follow'`), shows the source workout's
  aggregate rating in a small row below the existing linked-owner banner section

### Acceptance Criteria
- [ ] Follower count and rating are visible consistently across every screen that lists public workouts

*(Migration is applied — this just needs a real device/emulator run to verify.)*

---

## Suggested Build Order

```
Phase A  →  Phase B  →  Phase C  →  Phase D
Schema      Browse       Rating       Rating
& counters  Popular tab  prompt       everywhere
```

A and B together are the minimum to satisfy request #1 ("browse popular workouts").
C is request #2 (rating after completing a followed workout). D is polish/consistency
and can slip if needed.

## Explicitly Out of Scope (for now)
- Comment/review text on ratings (just a 0–5 number, per the ask)
- Blocking/reporting abusive shared workouts (belongs with the `block` table already
  noted as future work in `social-features-plan.md`'s Cross-Cutting Concerns)
- Re-ranking "Browse Popular" by recency or personalized recommendations
