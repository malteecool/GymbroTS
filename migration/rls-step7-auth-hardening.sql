-- =============================================================================
-- Auth function hardening
-- =============================================================================
-- Three small fixes to the two functions that run at signup.
--
-- 1. handle_new_user() no longer falls back to the email address.
-- 2. Both functions get a fixed search_path.
-- 3. handle_new_user() is no longer callable over the REST API.
--
-- Idempotent and re-runnable. Rollback block at the bottom.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1 + 2. handle_new_user
-- -----------------------------------------------------------------------------
-- The old body was:
--     display_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email);
--     INSERT INTO app_user (id, name, handle) VALUES (new.id, display_name,
--         generate_handle(display_name));
--
-- app_user is readable by every signed-in user by design (see the directory
-- model note in rls-step3-social.sql), so that COALESCE published the address of
-- anyone who signed up without a full_name -- as their display name AND, via
-- generate_handle, as their public @handle. Nobody has hit it yet: all four
-- current accounts arrived with a real name. An email/password signup with no
-- name metadata would have, and it is not the kind of thing you want to discover
-- from a user.
--
-- The address stays in auth.users, which is not exposed through the API. There
-- is no email column on app_user and there should never be one.
--
-- Fallback order is now full_name, then name (some OAuth providers send that
-- instead), then the generated handle itself -- which yields 'user', 'user1',
-- 'user2' and so on. A dull display name is a fine outcome; a leaked address is
-- not. The profile editor lets them change it.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    display_name text;
    new_handle text;
BEGIN
    display_name := nullif(btrim(coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        ''
    )), '');

    -- Deliberately NOT new.email, and deliberately not derived from it either:
    -- generate_handle('ada@example.com') would mint the handle @adaexamplecom.
    new_handle := public.generate_handle(coalesce(display_name, 'user'));

    INSERT INTO public.app_user (id, name, handle, created_at, updated_at)
    VALUES (new.id, coalesce(display_name, new_handle), new_handle, now(), now());

    RETURN new;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. generate_handle -- search_path only, body unchanged
-- -----------------------------------------------------------------------------
-- Without a fixed search_path, whoever calls this controls which schema
-- `app_user` resolves to, and the uniqueness loop can be pointed at a table
-- they own. Harmless for an INVOKER function in most cases, but it runs inside
-- SECURITY DEFINER context during signup, which is where it stops being
-- theoretical.

CREATE OR REPLACE FUNCTION public.generate_handle(base_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    slug text;
    candidate text;
    suffix int := 0;
BEGIN
    slug := lower(coalesce(base_name, ''));
    -- Fold the accented characters this user base actually produces before
    -- stripping, so "Håkan" becomes "hakan" rather than "hkan".
    slug := translate(slug, 'åäöøæéèüñ', 'aaooaeeun');
    slug := regexp_replace(slug, '[^a-z0-9]+', '', 'g');
    slug := left(slug, 20);

    IF length(slug) < 3 THEN
        slug := 'user';
    END IF;

    candidate := slug;
    WHILE EXISTS (SELECT 1 FROM public.app_user WHERE lower(handle) = candidate) LOOP
        suffix := suffix + 1;
        candidate := left(slug, 20 - length(suffix::text)) || suffix::text;
    END LOOP;

    RETURN candidate;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Take both off the REST API
-- -----------------------------------------------------------------------------
-- handle_new_user is a trigger function, so PostgREST exposing it at
-- /rest/v1/rpc/handle_new_user was never useful -- but it is SECURITY DEFINER,
-- and a SECURITY DEFINER function reachable by `anon` is worth removing on
-- principle rather than reasoning about each time.
--
-- Safe to revoke: the trigger mechanism invokes it as the table owner and does
-- not consult these grants. That is NOT true of the RLS helper functions, which
-- must keep their grant to `authenticated` -- see the note in
-- rls-step2-training-data.sql.

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_handle(text) FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- NOT FIXABLE IN SQL
-- =============================================================================
-- Leaked-password protection (checking new passwords against HaveIBeenPwned) is
-- an Auth setting, not a database object. Turn it on at:
--   Dashboard -> Authentication -> Providers -> Email -> "Prevent use of leaked
--   passwords"
--
-- =============================================================================
-- DELIBERATELY NOT DONE: dropping exercise.exe_muscle_groups
-- =============================================================================
-- It was on the cleanup list as a dead column. No application code reads it --
-- that part was right -- but the data is not disposable:
--
--   * 70 rows populated, all of them the seeded default exercises
--   * 36 are multi-valued (CHEST+TRICEPS+SHOULDERS, GLUTES+HAMSTRINGS+BACK)
--   * it uses finer categories than the singular column's CHECK even allows --
--     quads, hamstrings and calves, where exe_muscle_group has only 'legs'
--
-- So it is a richer taxonomy that the app stopped using, not duplicate data.
-- Dropping it is irreversible and would throw that away. Left in place.
--
-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- The previous handle_new_user body is quoted at the top of this file; the
-- grants can be restored with:
--   GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.generate_handle(text) TO anon, authenticated;
