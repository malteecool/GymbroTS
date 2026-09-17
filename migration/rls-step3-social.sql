-- =============================================================================
-- RLS step 3 of 5 -- social graph, posts and planning
-- =============================================================================
-- Covers the remaining 15 exposed tables: app_user, workout, split, split_day,
-- split_week, day, follows, block, post, reaction, comment, comment_reaction,
-- notification, report, workout_rating.
--
-- After this, every table in the public schema has RLS.
--
-- THE app_user DECISION (directory model, chosen deliberately)
-- -----------------------------------------------------------
-- Any signed-in user can read any app_user row. That is a decision, not an
-- oversight. The table holds name, handle, bio, avatar_url and is_public --
-- there is no email column in production -- so a row is a public profile card.
-- More importantly, the app reads these rows from far more places than search:
-- the following-feed embeds author names for accounts that are NOT public,
-- comments embed the commenter, notifications embed the actor (often a stranger
-- who liked your post), and the blocked-accounts settings screen has to read the
-- profiles of the very people you blocked in order to list them.
--
-- A policy strict enough to hide blocked users would break that last screen, and
-- every branch added to cover the others is another chance for a name to render
-- blank. So is_public and blocking stay what they already are -- discovery and
-- feed rules, enforced in the query layer -- and the database enforces the part
-- that actually matters: nobody writes to a profile that is not theirs.
--
-- KNOWN BEHAVIOUR CHANGE
-- ----------------------
-- getPublicProfile() counts a user's workouts with no is_public filter, so
-- another person's profile currently shows their TOTAL workout count. Under the
-- policy below that count drops to the public ones only. That is arguably the
-- more correct number -- the old one leaked how much someone trains from a
-- profile that shows none of it -- but it is a visible change, not a no-op.
--
-- Idempotent and re-runnable. Rollback block at the bottom.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER for the same reason as step 2: a policy's subquery is itself
-- subject to RLS, so comment -> post -> comment would recurse.

CREATE OR REPLACE FUNCTION public.owns_split(s uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.split x
        WHERE x.id = s AND x.user_id = (SELECT auth.uid())
    );
$$;

-- A post you are allowed to see at all: public, or your own.
CREATE OR REPLACE FUNCTION public.post_is_visible(p uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.post x
        WHERE x.id = p AND (x.is_public OR x.user_id = (SELECT auth.uid()))
    );
$$;

CREATE OR REPLACE FUNCTION public.owns_comment(c uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.comment x
        WHERE x.id = c AND x.user_id = (SELECT auth.uid())
    );
$$;

-- Visibility of the comment's post, for the like tables hanging off it.
CREATE OR REPLACE FUNCTION public.comment_is_visible(c uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.comment x
        JOIN public.post p ON p.id = x.post_id
        WHERE x.id = c AND (p.is_public OR p.user_id = (SELECT auth.uid()))
    );
$$;

REVOKE ALL ON FUNCTION public.owns_split(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.post_is_visible(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_comment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.comment_is_visible(uuid) FROM PUBLIC, anon;

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
-- app_user
-- -----------------------------------------------------------------------------
-- No INSERT policy: rows are minted by the on_auth_user_created trigger, which
-- is SECURITY DEFINER and bypasses RLS. Nothing in the client inserts a profile,
-- and nothing should. No DELETE policy either -- accounts go through auth, and
-- the FK cascade does the rest.

ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_user_select" ON public.app_user;
CREATE POLICY "app_user_select" ON public.app_user
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "app_user_update_own" ON public.app_user;
CREATE POLICY "app_user_update_own" ON public.app_user
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- workout
-- -----------------------------------------------------------------------------
-- The counter columns (copy_count, follower_count, avg_rating, rating_count)
-- live on rows their updater does not own. That is fine now and only now:
-- step 1 moved them into SECURITY DEFINER triggers, which bypass these policies.
-- Re-introducing a client-side counter write would fail the WITH CHECK below.

ALTER TABLE public.workout ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_select" ON public.workout;
CREATE POLICY "workout_select" ON public.workout
FOR SELECT TO authenticated
USING (wor_user_id = (SELECT auth.uid()) OR is_public);

DROP POLICY IF EXISTS "workout_insert" ON public.workout;
CREATE POLICY "workout_insert" ON public.workout
FOR INSERT TO authenticated
WITH CHECK (wor_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "workout_update" ON public.workout;
CREATE POLICY "workout_update" ON public.workout
FOR UPDATE TO authenticated
USING (wor_user_id = (SELECT auth.uid()))
WITH CHECK (wor_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "workout_delete" ON public.workout;
CREATE POLICY "workout_delete" ON public.workout
FOR DELETE TO authenticated
USING (wor_user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- split / split_day / split_week / day  --  strictly private
-- -----------------------------------------------------------------------------
-- A training split is nobody else's business; none of it is shared anywhere in
-- the app. `day` is the legacy table superseded by split_day -- still present in
-- production and still exposed, so it gets the same treatment rather than being
-- left as the one open door.

ALTER TABLE public.split ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "split_own" ON public.split;
CREATE POLICY "split_own" ON public.split
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

ALTER TABLE public.split_day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "split_day_own" ON public.split_day;
CREATE POLICY "split_day_own" ON public.split_day
FOR ALL TO authenticated
USING (public.owns_split(split_id))
WITH CHECK (public.owns_split(split_id));

ALTER TABLE public.split_week ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "split_week_own" ON public.split_week;
CREATE POLICY "split_week_own" ON public.split_week
FOR ALL TO authenticated
USING (public.owns_split(split_id))
WITH CHECK (public.owns_split(split_id));

ALTER TABLE public.day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "day_own" ON public.day;
CREATE POLICY "day_own" ON public.day
FOR ALL TO authenticated
USING (public.owns_split(split_id))
WITH CHECK (public.owns_split(split_id));

-- -----------------------------------------------------------------------------
-- follows
-- -----------------------------------------------------------------------------
-- The follow graph is readable: follower/following counts are shown on every
-- profile, and the app reads the graph to build feeds. You may only create a
-- follow as yourself.
--
-- DELETE covers BOTH directions on purpose. blockUser() severs the relationship
-- both ways in one statement -- including the row where the *other* person is
-- the follower -- so a follower_id-only policy would silently leave half the
-- relationship in place and resurrect it when the block was lifted.

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select" ON public.follows;
CREATE POLICY "follows_select" ON public.follows
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
CREATE POLICY "follows_insert_own" ON public.follows
FOR INSERT TO authenticated
WITH CHECK (follower_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "follows_delete_either_side" ON public.follows;
CREATE POLICY "follows_delete_either_side" ON public.follows
FOR DELETE TO authenticated
USING (
    follower_id = (SELECT auth.uid())
    OR following_id = (SELECT auth.uid())
);

-- -----------------------------------------------------------------------------
-- block
-- -----------------------------------------------------------------------------
-- Readable from both sides because getBlockedIds() needs both to decide what to
-- hide, but only the blocker can create or lift a block.

ALTER TABLE public.block ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "block_select_involved" ON public.block;
CREATE POLICY "block_select_involved" ON public.block
FOR SELECT TO authenticated
USING (
    blocker_id = (SELECT auth.uid())
    OR blocked_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "block_insert_own" ON public.block;
CREATE POLICY "block_insert_own" ON public.block
FOR INSERT TO authenticated
WITH CHECK (blocker_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "block_delete_own" ON public.block;
CREATE POLICY "block_delete_own" ON public.block
FOR DELETE TO authenticated
USING (blocker_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- post
-- -----------------------------------------------------------------------------
-- createPost() inserts with .select(), and a RETURNING clause needs a
-- satisfying SELECT policy on the new row, not just the INSERT check -- the
-- same trap the storage policies hit. The own-rows branch of the SELECT policy
-- covers it.

ALTER TABLE public.post ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_select" ON public.post;
CREATE POLICY "post_select" ON public.post
FOR SELECT TO authenticated
USING (is_public OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "post_insert_own" ON public.post;
CREATE POLICY "post_insert_own" ON public.post
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "post_update_own" ON public.post;
CREATE POLICY "post_update_own" ON public.post
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "post_delete_own" ON public.post;
CREATE POLICY "post_delete_own" ON public.post
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- reaction (post likes)
-- -----------------------------------------------------------------------------
-- Readable wherever the post is, so like counts render. You may only like as
-- yourself, and only something you can actually see.

ALTER TABLE public.reaction ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reaction_select" ON public.reaction;
CREATE POLICY "reaction_select" ON public.reaction
FOR SELECT TO authenticated
USING (public.post_is_visible(post_id));

DROP POLICY IF EXISTS "reaction_insert_own" ON public.reaction;
CREATE POLICY "reaction_insert_own" ON public.reaction
FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.post_is_visible(post_id)
);

DROP POLICY IF EXISTS "reaction_delete_own" ON public.reaction;
CREATE POLICY "reaction_delete_own" ON public.reaction
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- comment
-- -----------------------------------------------------------------------------
-- deleteComment() filters on user_id, so only the author deletes -- a post
-- owner cannot remove a comment on their own post. The policy matches the code
-- rather than quietly widening it; if that is the wrong product call it should
-- change in both places at once.

ALTER TABLE public.comment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_select" ON public.comment;
CREATE POLICY "comment_select" ON public.comment
FOR SELECT TO authenticated
USING (public.post_is_visible(post_id));

DROP POLICY IF EXISTS "comment_insert_own" ON public.comment;
CREATE POLICY "comment_insert_own" ON public.comment
FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.post_is_visible(post_id)
);

DROP POLICY IF EXISTS "comment_update_own" ON public.comment;
CREATE POLICY "comment_update_own" ON public.comment
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "comment_delete_own" ON public.comment;
CREATE POLICY "comment_delete_own" ON public.comment
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- comment_reaction (comment likes)
-- -----------------------------------------------------------------------------

ALTER TABLE public.comment_reaction ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_reaction_select" ON public.comment_reaction;
CREATE POLICY "comment_reaction_select" ON public.comment_reaction
FOR SELECT TO authenticated
USING (public.comment_is_visible(comment_id));

DROP POLICY IF EXISTS "comment_reaction_insert_own" ON public.comment_reaction;
CREATE POLICY "comment_reaction_insert_own" ON public.comment_reaction
FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.comment_is_visible(comment_id)
);

DROP POLICY IF EXISTS "comment_reaction_delete_own" ON public.comment_reaction;
CREATE POLICY "comment_reaction_delete_own" ON public.comment_reaction
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- notification
-- -----------------------------------------------------------------------------
-- You read only your own. You may raise one for someone else -- that is what
-- liking or following does -- but only ever as yourself, so nobody can forge a
-- notification that appears to come from another account.

ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_select_own" ON public.notification;
CREATE POLICY "notification_select_own" ON public.notification
FOR SELECT TO authenticated
USING (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notification_insert_as_self" ON public.notification;
CREATE POLICY "notification_insert_as_self" ON public.notification
FOR INSERT TO authenticated
WITH CHECK (actor_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notification_update_own" ON public.notification;
CREATE POLICY "notification_update_own" ON public.notification
FOR UPDATE TO authenticated
USING (recipient_id = (SELECT auth.uid()))
WITH CHECK (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notification_delete_own" ON public.notification;
CREATE POLICY "notification_delete_own" ON public.notification
FOR DELETE TO authenticated
USING (recipient_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- report
-- -----------------------------------------------------------------------------
-- File your own, read your own, and that is all. No UPDATE and no DELETE by
-- anyone: a report is evidence, and the previous state of the world let the
-- reported user delete the reports filed against them.
--
-- Moderation tooling should read this table with the service role, never the
-- anon key.

ALTER TABLE public.report ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_insert_own" ON public.report;
CREATE POLICY "report_insert_own" ON public.report
FOR INSERT TO authenticated
WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "report_select_own" ON public.report;
CREATE POLICY "report_select_own" ON public.report
FOR SELECT TO authenticated
USING (reporter_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- workout_rating
-- -----------------------------------------------------------------------------
-- One row per person per workout, and only ever your own. The published average
-- is derived by the step 1 trigger, so nothing here needs to read anyone else's
-- score. rateWorkout() upserts, which needs INSERT and UPDATE both.

ALTER TABLE public.workout_rating ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_rating_own" ON public.workout_rating;
CREATE POLICY "workout_rating_own" ON public.workout_rating
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TABLE public.app_user         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.workout          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.split            DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.split_day        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.split_week       DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.day              DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.follows          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.block            DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.post             DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.reaction         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.comment          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.comment_reaction DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notification     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.report           DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.workout_rating   DISABLE ROW LEVEL SECURITY;
