-- =============================================================================
-- RLS step 4 of 5 -- creator subscriptions and paid workout content
-- =============================================================================
-- Per-creator subscriptions: you subscribe to a person, and that unlocks every
-- workout they have marked subscriber-only. Billing is deliberately
-- provider-agnostic -- the schema records which provider and which external id,
-- and nothing more.
--
-- THE ONE RULE THIS FILE EXISTS TO ENFORCE
-- ----------------------------------------
-- Entitlement is never writable by a client. The `subscription` table has a
-- SELECT policy and nothing else: no INSERT, no UPDATE, no DELETE for
-- `authenticated`. Rows are written exclusively by the service role, from a
-- billing webhook. A client that could insert its own subscription row would be
-- a client that grants itself free access, and no amount of checking in the app
-- would matter.
--
-- This is why the paywall has to live here. The anon key ships inside the APK,
-- so a paywall enforced in the client is decoration. The database is the only
-- place the check cannot be edited out.
--
-- WHAT IS GATED, AND WHAT IS NOT
-- ------------------------------
-- A subscriber-only workout stays *visible*: name, creator, rating, follower
-- count. That is the shop window, and it has to be browsable for anyone to
-- consider paying for it. What is gated is the contents -- the exercise list.
-- So `workout` keeps its existing SELECT policy, while `workout_exercise` and
-- `exercise` gain an entitlement check.
--
-- APPLYING THIS CHANGES NO EXISTING BEHAVIOUR
-- ------------------------------------------
-- access_tier defaults to 'free', so every workout that exists today keeps
-- behaving exactly as it does today. The gate only engages when a creator
-- actually marks something subscriber-only.
--
-- Idempotent and re-runnable. Rollback block at the bottom.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- creator_plan -- the shop window
-- -----------------------------------------------------------------------------
-- What a creator charges, and whether they are open for business. The price is
-- display metadata only: the actual charge happens at the payment provider, and
-- nothing here is trusted for billing. Stored in minor units (cents/öre) as an
-- integer, because floating point money is a bug waiting to happen.

CREATE TABLE IF NOT EXISTS public.creator_plan (
    creator_id UUID PRIMARY KEY REFERENCES public.app_user(id) ON DELETE CASCADE,
    price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
    is_accepting_subscribers BOOLEAN NOT NULL DEFAULT false,
    blurb TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- subscription -- the entitlement record
-- -----------------------------------------------------------------------------
-- One row per (subscriber, creator) pair, upserted by the billing webhook.
--
-- `access_expires_at` is the single source of truth for when access ends, and
-- it is deliberately separate from the billing period. A refund or chargeback
-- cuts access by setting it to now(), without having to model the billing
-- calendar. A cancellation that still has paid time left keeps status 'active'
-- with cancel_at_period_end = true, so the subscriber keeps what they paid for.
--
-- Entitled therefore means exactly: status = 'active' AND access_expires_at > now().

CREATE TABLE IF NOT EXISTS public.subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,

    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'refunded')),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    access_expires_at TIMESTAMPTZ NOT NULL,

    -- Which system charged the money, and its id for this subscription there.
    -- Kept generic on purpose: 'revenuecat', 'stripe', 'manual' (comps and
    -- testing) all fit without a schema change.
    provider TEXT NOT NULL DEFAULT 'manual',
    external_subscription_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (subscriber_id, creator_id),
    CHECK (subscriber_id <> creator_id)
);

-- Partial index matching the entitlement predicate: the hot path is "is this
-- one pair currently active", evaluated per row inside RLS.
CREATE INDEX IF NOT EXISTS idx_subscription_active
    ON public.subscription (subscriber_id, creator_id)
    WHERE status = 'active';

-- The creator's own subscriber list.
CREATE INDEX IF NOT EXISTS idx_subscription_creator ON public.subscription (creator_id);

-- One external id belongs to one subscription, so a replayed or duplicated
-- webhook cannot open a second entitlement.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_external
    ON public.subscription (provider, external_subscription_id)
    WHERE external_subscription_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- workout.access_tier
-- -----------------------------------------------------------------------------
-- Composes with the existing is_public rather than replacing it, so no existing
-- query changes meaning:
--   is_public = false                        -> private, not shared at all
--   is_public = true,  tier = 'free'         -> shared, contents free (today)
--   is_public = true,  tier = 'subscribers'  -> listed publicly, contents gated
--
-- tier is meaningless while is_public is false. That is left unconstrained on
-- purpose: un-sharing a workout should not have to rewrite its tier, and
-- re-sharing should not silently make paid content free.

ALTER TABLE public.workout
    ADD COLUMN IF NOT EXISTS access_tier TEXT NOT NULL DEFAULT 'free';

ALTER TABLE public.workout DROP CONSTRAINT IF EXISTS workout_access_tier_check;
ALTER TABLE public.workout ADD CONSTRAINT workout_access_tier_check
    CHECK (access_tier IN ('free', 'subscribers'));

CREATE INDEX IF NOT EXISTS idx_workout_subscriber_tier
    ON public.workout (wor_user_id) WHERE access_tier = 'subscribers';

-- -----------------------------------------------------------------------------
-- Entitlement helpers
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER, like every other helper here: `subscription` has RLS, so a
-- policy reading it directly would recurse. See the note in the step 2/3 files
-- about why EXECUTE must stay granted to `authenticated`.

CREATE OR REPLACE FUNCTION public.has_creator_access(creator uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        creator = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.subscription s
            WHERE s.subscriber_id = (SELECT auth.uid())
              AND s.creator_id = creator
              AND s.status = 'active'
              AND s.access_expires_at > now()
        );
$$;

-- May the caller see this workout's CONTENTS (not merely its listing)?
CREATE OR REPLACE FUNCTION public.workout_content_visible(w uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workout x
        WHERE x.id = w
          AND (
              x.wor_user_id = (SELECT auth.uid())
              OR (
                  x.is_public
                  AND (x.access_tier = 'free' OR public.has_creator_access(x.wor_user_id))
              )
          )
    );
$$;

-- Replaces exercise_in_public_workout, which predated paid content and would
-- hand out a subscriber-only workout's exercises to anyone who could see it
-- listed -- which is everyone.
CREATE OR REPLACE FUNCTION public.exercise_in_visible_workout(e uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workout_exercise we
        JOIN public.workout w ON w.id = we.workout_id
        WHERE we.exercise_id = e
          AND w.is_public
          AND (w.access_tier = 'free' OR public.has_creator_access(w.wor_user_id))
    );
$$;

REVOKE ALL ON FUNCTION public.has_creator_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.workout_content_visible(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exercise_in_visible_workout(uuid) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- Re-point the step 2 policies at the tier-aware helpers
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "exercise_select" ON public.exercise;
CREATE POLICY "exercise_select" ON public.exercise
FOR SELECT TO authenticated
USING (
    exe_user_id = (SELECT auth.uid())
    OR exe_user_id IS NULL                        -- the shared default library
    OR public.exercise_in_visible_workout(id)     -- free templates, or ones you pay for
);

DROP POLICY IF EXISTS "workout_exercise_select" ON public.workout_exercise;
CREATE POLICY "workout_exercise_select" ON public.workout_exercise
FOR SELECT TO authenticated
USING (public.workout_content_visible(workout_id));

-- Now unreferenced, and dangerous to leave lying around: both answer the
-- pre-paywall question and would silently reopen the gate if a future policy
-- reached for the familiar name.
DROP FUNCTION IF EXISTS public.exercise_in_public_workout(uuid);
DROP FUNCTION IF EXISTS public.workout_is_public(uuid);

-- -----------------------------------------------------------------------------
-- RLS: subscription
-- -----------------------------------------------------------------------------
-- Read-only to clients, and only for the two parties involved. There is no
-- write policy of any kind, so every INSERT/UPDATE/DELETE from the anon or
-- authenticated key is refused no matter what it claims. The billing webhook
-- uses the service role, which bypasses RLS entirely.

ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_select_involved" ON public.subscription;
CREATE POLICY "subscription_select_involved" ON public.subscription
FOR SELECT TO authenticated
USING (
    subscriber_id = (SELECT auth.uid())
    OR creator_id = (SELECT auth.uid())
);

-- -----------------------------------------------------------------------------
-- RLS: creator_plan
-- -----------------------------------------------------------------------------
-- Readable by everyone signed in (it is a price tag), writable only by the
-- creator it belongs to.

ALTER TABLE public.creator_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_plan_select" ON public.creator_plan;
CREATE POLICY "creator_plan_select" ON public.creator_plan
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "creator_plan_insert_own" ON public.creator_plan;
CREATE POLICY "creator_plan_insert_own" ON public.creator_plan
FOR INSERT TO authenticated
WITH CHECK (creator_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "creator_plan_update_own" ON public.creator_plan;
CREATE POLICY "creator_plan_update_own" ON public.creator_plan
FOR UPDATE TO authenticated
USING (creator_id = (SELECT auth.uid()))
WITH CHECK (creator_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "creator_plan_delete_own" ON public.creator_plan;
CREATE POLICY "creator_plan_delete_own" ON public.creator_plan
FOR DELETE TO authenticated
USING (creator_id = (SELECT auth.uid()));

-- =============================================================================
-- FOLLOW-UP WORK THIS SCHEMA DOES NOT DO
-- =============================================================================
-- 1. The webhook itself. A Supabase edge function using the SERVICE ROLE key,
--    verifying the provider's signature before it writes. The service role key
--    must never reach the app bundle.
-- 2. App changes: a tier control next to the existing share toggle, and a
--    paywall state on the workout detail screen. Note that copying a
--    subscriber-only workout you have not paid for already fails safe -- the
--    exercise rows are simply not readable -- but it fails as an empty copy
--    rather than a clear message, so the client should check first.
-- 3. Paid *assets* (video, PDF) do not belong in the `user-content` bucket:
--    it is public-read, so the URL is the content. They need a private bucket
--    and signed URLs issued only after has_creator_access() passes.
-- 4. Payouts, tax and refund handling are entirely outside this file.
--
-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- Restores the pre-paywall behaviour. The two helpers dropped above must be
-- recreated from migration/rls-step2-training-data.sql first, since the old
-- policies referenced them.
--
-- DROP POLICY IF EXISTS "exercise_select" ON public.exercise;
-- DROP POLICY IF EXISTS "workout_exercise_select" ON public.workout_exercise;
-- (then re-run the exercise/workout_exercise policy blocks from step 2)
-- ALTER TABLE public.subscription  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.creator_plan  DISABLE ROW LEVEL SECURITY;
