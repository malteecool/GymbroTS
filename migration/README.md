# Database migrations

Run order. Each file is idempotent, re-runnable, and carries its own rollback
block at the bottom.

| # | File | What it does |
|---|------|--------------|
| 1 | `supabase-migration.sql` | Tables, indexes, constraints, handles, muscle groups |
| 2 | `counter-triggers.sql` | Moves workout counters off the client into triggers |
| 3 | `rls-step2-training-data.sql` | RLS on `exercise`, `exercise_history`, `set`, `workout_exercise` |
| 4 | `rls-step3-social.sql` | RLS on the remaining 15 tables |
| 5 | `rls-step4-subscriptions.sql` | Creator subscriptions and paid-content gating |
| 6 | `rls-step6-creator-assets.sql` | Private bucket for paid creator assets |
| 7 | `rls-step7-auth-hardening.sql` | Signup no longer leaks the email; fixed `search_path` |

`mock-data.sql` is seed data for a scratch database. It is not part of the
sequence and should never be run against production.

## The order is load-bearing

**2 before 3 and 4.** The client used to maintain `copy_count`,
`follower_count`, `avg_rating` and `rating_count` with a read-modify-write
against *another user's* workout row. No ownership policy can allow that, so the
counters had to become `SECURITY DEFINER` triggers before `workout` could be
locked down. Applying the RLS steps without step 2 breaks copy, follow and
rating.

**5 last.** It replaces two helpers from step 3 — `exercise_in_public_workout`
and `workout_is_public` — that predate paid content. Left in place, they hand a
subscriber-only workout's exercise list to anyone who can see it listed, which
is everyone.

## How authorization works here

Every table in the `public` schema has RLS, and every policy is scoped
`TO authenticated`. The `anon` role matches no policy anywhere, so the key
shipped in the app reads nothing before sign-in.

Cross-table ownership checks go through `SECURITY DEFINER` helper functions
(`owns_exercise`, `post_is_visible`, `has_creator_access`, …) rather than inline
subqueries. A policy's subquery is itself subject to RLS on the table it reads,
so `comment` → `post` → `comment` would recurse. The helpers return a single
boolean and leak nothing the caller could not already determine with a `SELECT`.

`auth.uid()` is always written as `(SELECT auth.uid())`. Postgres then evaluates
it once per statement as an InitPlan instead of once per row.

### Do not "fix" the linter warning on the helpers

Supabase's database linter flags every helper under lint 0029, *Signed-In Users
Can Execute SECURITY DEFINER Function*, and suggests revoking `EXECUTE` from
`authenticated`. **Revoking it breaks every policy that calls the helper**, with
`permission denied for function` — an RLS policy expression is evaluated as the
*calling* role and needs that grant. Verified against this database.

Trigger functions are different: the trigger mechanism runs them as the table
owner, so those *are* revoked, and should stay that way.

## What is deliberately not enforced in the database

- **Blocking and `is_public` discovery rules** stay in the query layer.
  `app_user` uses a *directory model*: any signed-in user can read any profile
  row. This is a decision, not an oversight — the following-feed, comments,
  notifications and the blocked-accounts screen all read profiles of people who
  are neither public nor followed, and a policy strict enough to hide blocked
  users breaks the screen whose whole job is listing them. The database enforces
  the part that matters: nobody writes to a profile that is not theirs.

- **Entitlements are written only by the service role.** `subscription` has a
  `SELECT` policy and no write policy of any kind. Rows come from a billing
  webhook holding the service key. A client that could insert its own
  subscription row would grant itself free access, so no client can.

## Storage

Two buckets, and the split matters.

`user-content` is **public**: avatars and post photos, at
`avatars/{userId}/…` and `posts/{userId}/…`. Its URLs need no auth and never
expire. Correct for a profile picture, fatal for anything paid.

`creator-content` is **private**: paid assets at
`creator/{creatorId}/{workoutId}/{filename}`. There is no public route into it.
The client asks for a signed URL and Supabase evaluates the SELECT policy —
`has_creator_access()`, the same check that gates workout contents — before
issuing one. The signing endpoint *is* the paywall, so no edge function sits in
the read path.

In both buckets the id must be a real folder segment: `storage.foldername()`
returns folder segments only, never the filename, and every policy keys off
`[2]`. Baking the id into the filename breaks the gate silently.

One property signed URLs do not have: once issued, a URL works until it expires
regardless of a cancellation or refund behind it. Revocation is only as fast as
the TTL, which is why `ASSET_URL_TTL_SECONDS` is 120 and URLs are minted on
demand rather than cached.

## Still open

- The billing webhook itself (an edge function; the service role key must never
  reach the app bundle).
- Large video uploads. `CreatorAssetService.uploadCreatorAsset()` reads the
  file into memory as base64, which is fine for images and PDFs and will
  exhaust memory on a few-hundred-MB video. That needs a resumable (TUS)
  upload.
- **Leaked-password protection is off**, and it is the one item here that
  cannot be fixed in SQL — it is an Auth setting. Turn it on at Dashboard →
  Authentication → Providers → Email → *Prevent use of leaked passwords*.
- `exercise.exe_muscle_groups` (plural, array) is unused by the app but is **not
  disposable**, despite earlier appearances. 70 rows are populated, 36 of them
  multi-valued (`CHEST+TRICEPS+SHOULDERS`), using finer categories than the
  singular `exe_muscle_group` CHECK even permits — `quads`, `hamstrings`,
  `calves` where the singular has only `legs`. It is a richer taxonomy the app
  stopped reading, not duplicate data. Do not drop it without deciding what
  happens to those tags.
