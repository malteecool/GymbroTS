-- =============================================================================
-- Server-authoritative workout counters
-- =============================================================================
-- Moves copy_count / follower_count / avg_rating / rating_count off the client
-- and into the database.
--
-- WHY THIS COMES BEFORE RLS
-- -------------------------
-- Today the client maintains these counters with a read-modify-write against
-- *another user's* workout row (WorkoutService.copyWorkout / linkWorkout /
-- unlinkWorkout, WorkoutRatingService.rateWorkout). That is incompatible with
-- the RLS policy we actually want -- "you may UPDATE a workout you own" --
-- because copying a creator's workout has to touch the creator's row.
--
-- So the counters move into SECURITY DEFINER triggers, which run as the
-- function owner and therefore bypass RLS. Once the counters no longer depend
-- on clients writing to rows they don't own, strict ownership policies can go
-- on `workout` without breaking copy / follow / rate.
--
-- This migration is safe to apply while RLS is still disabled: it changes no
-- schema and breaks no existing call path. It is idempotent and re-runnable.
--
-- !! MUST SHIP WITH the matching app change that removes the client-side
-- !! counter writes. If both run, every counter double-counts.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- follower_count -- live count of people actively following this workout
-- -----------------------------------------------------------------------------
-- Recomputed from the child rows rather than incremented by a delta, so it is
-- self-healing: any drift already in the table is corrected the next time the
-- workout is followed or unfollowed. This also fixes a real bug -- deleting a
-- followed workout outright (removeWorkout) never decremented the source,
-- while unlinkWorkout did, so counts only ever drifted upward.

CREATE OR REPLACE FUNCTION public.recount_workout_followers(target_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    UPDATE public.workout w
    SET follower_count = (
        SELECT count(*)
        FROM public.workout c
        WHERE c.source_workout_id = target_id
          AND c.link_type = 'follow'
    )
    WHERE w.id = target_id;
$$;

CREATE OR REPLACE FUNCTION public.workout_follower_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.source_workout_id IS NOT NULL THEN
            PERFORM public.recount_workout_followers(NEW.source_workout_id);
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.source_workout_id IS NOT NULL THEN
            PERFORM public.recount_workout_followers(OLD.source_workout_id);
        END IF;
        RETURN OLD;
    END IF;

    -- UPDATE. Only react when the link itself moved. This is what stops the
    -- recursion: the counter write below is an UPDATE on `workout` too, but it
    -- leaves source_workout_id/link_type untouched, so the guard sends it
    -- straight out.
    IF (OLD.source_workout_id, OLD.link_type) IS DISTINCT FROM (NEW.source_workout_id, NEW.link_type) THEN
        IF OLD.source_workout_id IS NOT NULL THEN
            PERFORM public.recount_workout_followers(OLD.source_workout_id);
        END IF;
        IF NEW.source_workout_id IS NOT NULL
           AND NEW.source_workout_id IS DISTINCT FROM OLD.source_workout_id THEN
            PERFORM public.recount_workout_followers(NEW.source_workout_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workout_follower_count ON public.workout;
CREATE TRIGGER trg_workout_follower_count
AFTER INSERT OR UPDATE OR DELETE ON public.workout
FOR EACH ROW EXECUTE FUNCTION public.workout_follower_count_trigger();

-- -----------------------------------------------------------------------------
-- copy_count -- lifetime tally of one-time copies
-- -----------------------------------------------------------------------------
-- Deliberately NOT derived. Per workout-rework-plan.md Decision #2, copy_count
-- counts copies ever taken, not copies still in existence -- so it is a running
-- tally that only ever goes up, and deleting a copy must not walk it back.
-- That means it cannot be recomputed from the table, only incremented once at
-- the moment the copy is made. INSERT-only, matching what copyWorkout does today.

CREATE OR REPLACE FUNCTION public.workout_copy_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.link_type = 'copy' AND NEW.source_workout_id IS NOT NULL THEN
        UPDATE public.workout
        SET copy_count = copy_count + 1
        WHERE id = NEW.source_workout_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workout_copy_count ON public.workout;
CREATE TRIGGER trg_workout_copy_count
AFTER INSERT ON public.workout
FOR EACH ROW EXECUTE FUNCTION public.workout_copy_count_trigger();

-- -----------------------------------------------------------------------------
-- avg_rating / rating_count
-- -----------------------------------------------------------------------------
-- Recomputed from workout_rating on every change. avg_rating is rounded to 2dp
-- to match the NUMERIC(3,2) column; a workout with no ratings gets NULL rather
-- than 0, so "unrated" stays distinguishable from "rated zero" when sorting.

CREATE OR REPLACE FUNCTION public.recount_workout_rating(target_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    UPDATE public.workout w
    SET rating_count = agg.cnt,
        avg_rating   = CASE WHEN agg.cnt > 0 THEN round(agg.avg_val, 2) ELSE NULL END
    FROM (
        SELECT count(*) AS cnt, avg(rating)::numeric AS avg_val
        FROM public.workout_rating r
        WHERE r.workout_id = target_id
    ) AS agg
    WHERE w.id = target_id;
$$;

CREATE OR REPLACE FUNCTION public.workout_rating_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recount_workout_rating(OLD.workout_id);
        RETURN OLD;
    END IF;

    PERFORM public.recount_workout_rating(NEW.workout_id);

    -- An upsert that moves a rating between workouts would leave the old one
    -- stale. The unique constraint on (workout_id, user_id) makes this all but
    -- impossible, but recounting both sides costs one indexed aggregate.
    IF TG_OP = 'UPDATE' AND OLD.workout_id IS DISTINCT FROM NEW.workout_id THEN
        PERFORM public.recount_workout_rating(OLD.workout_id);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workout_rating ON public.workout_rating;
CREATE TRIGGER trg_workout_rating
AFTER INSERT OR UPDATE OR DELETE ON public.workout_rating
FOR EACH ROW EXECUTE FUNCTION public.workout_rating_trigger();

-- -----------------------------------------------------------------------------
-- Backfill -- correct whatever the client left behind
-- -----------------------------------------------------------------------------

-- Derived counters: recomputed from source, so any existing drift is erased.
UPDATE public.workout w
SET follower_count = (
        SELECT count(*) FROM public.workout c
        WHERE c.source_workout_id = w.id AND c.link_type = 'follow'
    ),
    rating_count = (
        SELECT count(*) FROM public.workout_rating r WHERE r.workout_id = w.id
    ),
    avg_rating = (
        SELECT round(avg(r.rating)::numeric, 2) FROM public.workout_rating r
        WHERE r.workout_id = w.id
    );

-- copy_count is a lifetime tally and cannot be re-derived -- a copy that has
-- since been deleted still counts. The live copies are therefore a floor, not
-- the answer: only raise the stored value, never lower it.
UPDATE public.workout w
SET copy_count = GREATEST(
        w.copy_count,
        (SELECT count(*) FROM public.workout c
         WHERE c.source_workout_id = w.id AND c.link_type = 'copy')
    );

-- -----------------------------------------------------------------------------
-- Lock down the helpers
-- -----------------------------------------------------------------------------
-- Everything above is SECURITY DEFINER, and SECURITY DEFINER plus a default
-- PUBLIC grant is what the database linter flags (lint 0028/0029). The
-- recount_* helpers genuinely need this: they take a workout id, so exposed
-- they would be callable as /rest/v1/rpc/recount_workout_rating by anyone.
--
-- The trigger functions are not callable in practice -- Postgres rejects a
-- direct call to a function returning `trigger` -- but they are revoked too, so
-- they stay out of the advisor's report. New warnings are worth avoiding on
-- their own: they bury the findings that do matter.
--
-- Triggers fire as the table owner regardless of these grants, so revoking
-- costs nothing.

REVOKE ALL ON FUNCTION public.recount_workout_followers(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recount_workout_rating(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workout_follower_count_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workout_copy_count_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workout_rating_trigger() FROM PUBLIC, anon, authenticated;
