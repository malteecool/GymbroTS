-- =============================================================================
-- Private bucket for paid creator assets
-- =============================================================================
-- The database gate from step 4 stops at the database. A creator's video or PDF
-- lives in object storage, and `user-content` is public-read: its URLs need no
-- auth, never expire, and cannot be revoked. For a paid asset the URL *is* the
-- content -- one subscriber pastes a link and the paywall is gone.
--
-- So paid assets get their own bucket, private, where reads are gated by the
-- same has_creator_access() that gates the workout contents.
--
-- WHY THIS NEEDS NO EDGE FUNCTION
-- ------------------------------
-- A private bucket has no public URL. The client asks for a signed URL, and
-- Supabase evaluates the SELECT policy on storage.objects before issuing one.
-- Put the entitlement check in that policy and the signing endpoint becomes the
-- paywall -- no server code of our own in the path, nothing to keep in sync.
--
-- THE ONE PROPERTY THIS DOES NOT GIVE YOU
-- ---------------------------------------
-- A signed URL, once issued, works until it expires no matter what happens to
-- the subscription behind it. Revocation is therefore only as fast as the
-- expiry, which is why the client mints them on demand with a short TTL rather
-- than caching long-lived ones. See ASSET_URL_TTL_SECONDS in
-- services/CreatorAssetService.Service.ts.
--
-- PATH SHAPE (load-bearing)
-- -------------------------
--   creator/{creatorId}/{workoutId}/{filename}
--
-- storage.foldername() returns only the folder segments, never the filename, so
-- creatorId lands at [2] -- the same position user-content uses, and the same
-- reason: the id must be a real folder segment, not baked into the filename.
-- Every policy below keys off [2].
--
-- Idempotent and re-runnable. Rollback block at the bottom.
-- =============================================================================

-- public = false: no public URL exists for anything in here, at all.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'creator-content',
    'creator-content',
    false,
    524288000,  -- 500 MB, enough for a workout video without inviting a film
    ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,   -- never let this flip back to public by accident
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Entitlement check for an object path
-- -----------------------------------------------------------------------------
-- Wraps has_creator_access() with the path parsing, so the policies stay
-- readable and a malformed path fails closed instead of raising. A storage
-- object name is user-controlled: an upload called `creator/nonsense/x.mp4`
-- would make the ::uuid cast throw mid-policy, and an error in a policy is not
-- a denial -- it is a broken query for everyone touching the table.

CREATE OR REPLACE FUNCTION public.can_read_creator_asset(object_name text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    seg text;
    creator uuid;
BEGIN
    seg := (storage.foldername(object_name))[2];
    IF seg IS NULL THEN
        RETURN false;
    END IF;

    BEGIN
        creator := seg::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN false;
    END;

    -- has_creator_access() already returns true when the caller IS the creator,
    -- so this covers a creator reading back their own uploads.
    RETURN public.has_creator_access(creator);
END;
$$;

REVOKE ALL ON FUNCTION public.can_read_creator_asset(text) FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------
-- Scoped to this bucket only. The existing user-content policies are likewise
-- bucket-scoped, so the two sets never overlap -- in particular the
-- "Public read access to user content" policy cannot reach in here.

-- Read: the creator, or someone with a live subscription to them. This is the
-- policy the signed-URL endpoint evaluates, so it is the paywall.
DROP POLICY IF EXISTS "Subscribers can read creator assets" ON storage.objects;
CREATE POLICY "Subscribers can read creator assets"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'creator-content'
    AND public.can_read_creator_asset(name)
);

-- Write: the creator, into their own folder, and nowhere else. Deliberately
-- NOT has_creator_access() -- a subscriber can read a creator's folder, and
-- must never be able to write into it.
DROP POLICY IF EXISTS "Creators can upload their own assets" ON storage.objects;
CREATE POLICY "Creators can upload their own assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'creator-content'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Creators can update their own assets" ON storage.objects;
CREATE POLICY "Creators can update their own assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'creator-content'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
)
WITH CHECK (
    bucket_id = 'creator-content'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Creators can delete their own assets" ON storage.objects;
CREATE POLICY "Creators can delete their own assets"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'creator-content'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP POLICY IF EXISTS "Subscribers can read creator assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Creators can upload their own assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Creators can update their own assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Creators can delete their own assets" ON storage.objects;
-- DROP FUNCTION IF EXISTS public.can_read_creator_asset(text);
-- -- Objects must be removed before the bucket will drop:
-- -- DELETE FROM storage.objects WHERE bucket_id = 'creator-content';
-- -- DELETE FROM storage.buckets WHERE id = 'creator-content';
