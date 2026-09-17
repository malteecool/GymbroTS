-- =============================================================================
-- RLS step 2 of 5 -- private training data
-- =============================================================================
-- STATUS: applied to production 2026-09-17 and verified against live data.
-- Verified from SQL, not from the app: a device pass through Browse Popular ->
-- Copy/Follow -> Complete -> Rate is still outstanding, and also covers the
-- step 1 counters.
--
-- Enables RLS on exercise, exercise_history, set and workout_exercise.
--
-- These four are the leaves of the ownership tree and the bulk of what a user
-- would consider private: 134 exercises, 294 sessions, 823 sets. Step 1
-- (migration/counter-triggers.sql) had to land first, because the client used
-- to write counters onto other people's workout rows, which no ownership policy
-- could ever have allowed.
--
-- WHAT THE APP ACTUALLY DOES (verified against the code, not assumed)
-- -------------------------------------------------------------------
-- * exercise_history and set are only ever read for the signed-in user --
--   getWorkoutsCount/getWorkoutStreak take the current user, and no screen that
--   renders another person's content imports ExerciseService at all. So these
--   two are strictly self-scoped.
-- * exercise is NOT self-scoped. Three call sites read other people's rows:
--   userWorkouts.tsx and BrowsePopular.tsx preview a template's exercises, and
--   cloneWorkoutForUser/syncLinkedWorkout read the source's list when copying or
--   following. All four go through getWorkoutExercises(), which embeds
--   `exercise(*)` under workout_exercise -- and PostgREST applies RLS to the
--   embedded resource as well as the parent, so both tables need the public
--   case or Browse Popular silently renders empty workouts.
-- * There are 70 exercises with exe_user_id IS NULL. The column is nullable in
--   production (the schema file says NOT NULL -- it has drifted), and
--   getDefaultExercises() serves exactly these rows as the "default exercise"
--   picker. They are templates: addExercise() always inserts a new owned row
--   rather than mutating one, so they are readable by everyone and writable by
--   nobody.
--
-- WHY THE HELPERS ARE SECURITY DEFINER
-- ------------------------------------
-- A policy's subquery is itself subject to RLS on the tables it touches, so
-- `exercise` checking workout_exercise while workout_exercise checks exercise
-- deadlocks into infinite recursion. Routing every cross-table check through a
-- SECURITY DEFINER function breaks the cycle: the function bypasses RLS, and
-- because it only ever returns a boolean it leaks nothing beyond the answer to
-- the exact question the policy asked.
--
-- Idempotent and re-runnable. To undo, see the rollback block at the bottom.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ownership helpers
-- -----------------------------------------------------------------------------
-- auth.uid() is wrapped in a scalar subquery throughout. Postgres then treats
-- it as a one-off InitPlan instead of re-evaluating it per row, which is the
-- difference between one call and 823 of them on the `set` table.

CREATE OR REPLACE FUNCTION public.owns_exercise(e uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.exercise x
        WHERE x.id = e AND x.exe_user_id = (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.owns_exercise_history(h uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.exercise_history eh
        JOIN public.exercise x ON x.id = eh.exercise_id
        WHERE eh.id = h AND x.exe_user_id = (SELECT auth.uid())
    );
$$;

-- True for an exercise sitting in anybody's public workout. This is what makes
-- "preview before you copy" work without opening up the rest of the library.
CREATE OR REPLACE FUNCTION public.exercise_in_public_workout(e uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workout_exercise we
        JOIN public.workout w ON w.id = we.workout_id
        WHERE we.exercise_id = e AND w.is_public
    );
$$;

-- `workout` has no RLS until step 3. These are SECURITY DEFINER now so that
-- turning it on later cannot quietly change what they return.
CREATE OR REPLACE FUNCTION public.owns_workout(w uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workout x
        WHERE x.id = w AND x.wor_user_id = (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.workout_is_public(w uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workout x
        WHERE x.id = w AND x.is_public
    );
$$;

REVOKE ALL ON FUNCTION public.owns_exercise(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_exercise_history(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.exercise_in_public_workout(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_workout(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.workout_is_public(uuid) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- DO NOT "FIX" THE ADVISOR WARNING ON THESE HELPERS
-- -----------------------------------------------------------------------------
-- The database linter flags every helper below as
-- "Signed-In Users Can Execute SECURITY DEFINER Function" (lint 0029) and
-- suggests revoking EXECUTE from `authenticated`. Do not do it. Verified against
-- this database: revoking makes every policy that calls the helper fail with
-- "permission denied for function", because an RLS policy expression is
-- evaluated as the *calling* role and needs EXECUTE for it. That is the
-- difference between these and the step 1 trigger functions, which the trigger
-- mechanism runs as the table owner and which therefore can be revoked.
--
-- The exposure is nil in any case: each one answers a single boolean about the
-- caller's own access ("do I own this", "can I see this"), which is exactly what
-- the caller could already determine with a SELECT.

-- -----------------------------------------------------------------------------
-- exercise
-- -----------------------------------------------------------------------------

ALTER TABLE public.exercise ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_select" ON public.exercise;
CREATE POLICY "exercise_select" ON public.exercise
FOR SELECT TO authenticated
USING (
    exe_user_id = (SELECT auth.uid())
    OR exe_user_id IS NULL                          -- the shared default library
    OR public.exercise_in_public_workout(id)        -- template preview / copy
);

-- Writes are own-rows-only, and the NULL-owner defaults are deliberately
-- excluded from all three: a user may copy a default into their own library,
-- never edit the shared one.
DROP POLICY IF EXISTS "exercise_insert" ON public.exercise;
CREATE POLICY "exercise_insert" ON public.exercise
FOR INSERT TO authenticated
WITH CHECK (exe_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "exercise_update" ON public.exercise;
CREATE POLICY "exercise_update" ON public.exercise
FOR UPDATE TO authenticated
USING (exe_user_id = (SELECT auth.uid()))
WITH CHECK (exe_user_id = (SELECT auth.uid()));   -- and cannot be given away

DROP POLICY IF EXISTS "exercise_delete" ON public.exercise;
CREATE POLICY "exercise_delete" ON public.exercise
FOR DELETE TO authenticated
USING (exe_user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- exercise_history  --  strictly self
-- -----------------------------------------------------------------------------
-- Ownership is indirect (history -> exercise -> user), so every command routes
-- through the same helper. Nothing about another person's logged sessions is
-- readable, including from a public workout: the public part of a workout is
-- its exercise list, never how the creator performed it.

ALTER TABLE public.exercise_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_history_own" ON public.exercise_history;
CREATE POLICY "exercise_history_own" ON public.exercise_history
FOR ALL TO authenticated
USING (public.owns_exercise(exercise_id))
WITH CHECK (public.owns_exercise(exercise_id));

-- -----------------------------------------------------------------------------
-- set  --  strictly self
-- -----------------------------------------------------------------------------
-- One level deeper again (set -> history -> exercise -> user).

ALTER TABLE public.set ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "set_own" ON public.set;
CREATE POLICY "set_own" ON public.set
FOR ALL TO authenticated
USING (public.owns_exercise_history(exercise_history_id))
WITH CHECK (public.owns_exercise_history(exercise_history_id));

-- -----------------------------------------------------------------------------
-- workout_exercise  --  the join that carries the public case
-- -----------------------------------------------------------------------------
-- Readable when you own the workout or the workout is public; writable only by
-- the workout's owner. Keyed on the workout rather than the exercise because
-- that is what the app filters by, and because a public workout's membership
-- list is exactly the thing Browse Popular needs to show.

ALTER TABLE public.workout_exercise ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_exercise_select" ON public.workout_exercise;
CREATE POLICY "workout_exercise_select" ON public.workout_exercise
FOR SELECT TO authenticated
USING (
    public.owns_workout(workout_id)
    OR public.workout_is_public(workout_id)
);

DROP POLICY IF EXISTS "workout_exercise_insert" ON public.workout_exercise;
CREATE POLICY "workout_exercise_insert" ON public.workout_exercise
FOR INSERT TO authenticated
WITH CHECK (public.owns_workout(workout_id));

DROP POLICY IF EXISTS "workout_exercise_update" ON public.workout_exercise;
CREATE POLICY "workout_exercise_update" ON public.workout_exercise
FOR UPDATE TO authenticated
USING (public.owns_workout(workout_id))
WITH CHECK (public.owns_workout(workout_id));

DROP POLICY IF EXISTS "workout_exercise_delete" ON public.workout_exercise;
CREATE POLICY "workout_exercise_delete" ON public.workout_exercise
FOR DELETE TO authenticated
USING (public.owns_workout(workout_id));

-- -----------------------------------------------------------------------------
-- Note on `anon`
-- -----------------------------------------------------------------------------
-- Every policy above is scoped TO authenticated, so the anon role now matches
-- no policy on these four tables and reads come back empty. The table grants it
-- still holds are inert while RLS is on. They are left in place rather than
-- revoked so this migration can be rolled back by disabling RLS alone, with no
-- second step to remember -- revoking them belongs with step 5, once every
-- table is covered.

-- =============================================================================
-- ROLLBACK (run only if this breaks something in the app)
-- =============================================================================
-- Restores the previous behaviour immediately. The policies are left defined
-- but dormant, so re-enabling is one ALTER per table.
--
-- ALTER TABLE public.exercise          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.exercise_history  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.set               DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.workout_exercise  DISABLE ROW LEVEL SECURITY;
