-- =============================================================================
-- GymbroTS Schema Migration
-- Safe to run against an existing database: uses IF NOT EXISTS / IF NOT EXISTS
-- guards throughout so no data is lost on re-runs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Core tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS APP_USER (
    ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    NAME VARCHAR(255) NOT NULL,
    EMAIL VARCHAR(255) NOT NULL UNIQUE,
    BIO TEXT,
    AVATAR_URL TEXT,
    IS_PUBLIC BOOLEAN NOT NULL DEFAULT false,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS EXERCISE (
    ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    EXE_NAME VARCHAR(255) NOT NULL,
    EXE_USER_ID UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    EXE_DATE TIMESTAMP NOT NULL,
    EXE_MAX_REPS INTEGER,
    EXE_MAX_WEIGHT DECIMAL(10, 2),
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS WORKOUT (
    ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    WOR_NAME VARCHAR(255) NOT NULL,
    WOR_USER_ID UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    WOR_COMPLETED_COUNT INTEGER DEFAULT 0,
    WOR_ESTIMATE_TIME INTEGER,
    WOR_LAST_DONE TIMESTAMP,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS WORKOUT_EXERCISE (
    WOE_ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    WORKOUT_ID UUID NOT NULL REFERENCES WORKOUT(ID) ON DELETE CASCADE,
    EXERCISE_ID UUID NOT NULL REFERENCES EXERCISE(ID) ON DELETE CASCADE,
    ORDINAL INTEGER NOT NULL,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(WORKOUT_ID, ORDINAL)
);

CREATE TABLE IF NOT EXISTS EXERCISE_HISTORY (
    ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    EXERCISE_ID UUID NOT NULL REFERENCES EXERCISE(ID) ON DELETE CASCADE,
    EXH_DATE TIMESTAMP NOT NULL,
    EXH_COMMENT TEXT,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS SET (
    ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    EXERCISE_HISTORY_ID UUID NOT NULL REFERENCES EXERCISE_HISTORY(ID) ON DELETE CASCADE,
    SET_WEIGHT DECIMAL(10, 2) NOT NULL,
    SET_REPS INTEGER NOT NULL,
    SET_ORDER INTEGER,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS split (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    spl_ref_week INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS split_day (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    split_id UUID NOT NULL REFERENCES split(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,  -- ISO day: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
    workout_id UUID REFERENCES WORKOUT(ID) ON DELETE SET NULL,  -- NULL = rest day
    ordinal INTEGER NOT NULL  -- 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
);

CREATE TABLE IF NOT EXISTS split_week (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    split_id UUID NOT NULL REFERENCES split(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,  -- ISO week number
    completed_days INTEGER[] NOT NULL DEFAULT '{}',  -- array of ordinal values (0-6)
    UNIQUE(split_id, week_number)
);

-- -----------------------------------------------------------------------------
-- Social: columns added to APP_USER (Phase 1)
-- These are no-ops if the columns already exist.
-- -----------------------------------------------------------------------------

ALTER TABLE APP_USER ADD COLUMN IF NOT EXISTS BIO TEXT;
ALTER TABLE APP_USER ADD COLUMN IF NOT EXISTS AVATAR_URL TEXT;
ALTER TABLE APP_USER ADD COLUMN IF NOT EXISTS IS_PUBLIC BOOLEAN NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- Social: follows table (Phase 1)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

-- -----------------------------------------------------------------------------
-- Social: post and reaction tables (Phase 2)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS post (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    workout_id UUID REFERENCES WORKOUT(ID) ON DELETE SET NULL,
    post_type TEXT NOT NULL CHECK (post_type IN ('workout_complete', 'pr_broken', 'milestone')),
    caption TEXT,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES post(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (post_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Social: comment and notification tables (Phase 3)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS comment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES post(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    post_id UUID REFERENCES post(id) ON DELETE CASCADE,
    notif_type TEXT NOT NULL CHECK (notif_type IN ('like', 'comment', 'follow')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Social: threaded comment replies
-- -----------------------------------------------------------------------------

-- A reply points at the comment it answers. NULL means the comment sits at the
-- top level of the post. Replies are one level deep by convention: the client
-- always attaches a reply to the top-level comment, never to another reply, so
-- a thread stays a post -> comment -> replies shape.
ALTER TABLE comment
    ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES comment(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- Social: comment likes
-- -----------------------------------------------------------------------------

-- Mirrors `reaction`, one row per person per comment. Needed for the "Top"
-- comment sort, which orders threads by how many likes they drew.
CREATE TABLE IF NOT EXISTS comment_reaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comment(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (comment_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Social: reply and comment-like notifications
-- -----------------------------------------------------------------------------

-- 'reply' and 'comment_like' joined the original three. Dropped by lookup
-- rather than by name: the original CHECK was written inline on the column, so
-- its generated name is not guaranteed across environments.
DO $$
DECLARE c record;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'notification'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%notif_type%'
    LOOP
        EXECUTE format('ALTER TABLE notification DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE notification ADD CONSTRAINT notification_notif_type_check
    CHECK (notif_type IN ('like', 'comment', 'follow', 'reply', 'comment_like'));

-- -----------------------------------------------------------------------------
-- Social: reports
-- -----------------------------------------------------------------------------

-- Reporting is a record, not an action: nothing in the app reads this table
-- back yet, it exists so the report option has somewhere to land for review.
-- `reported_user_id` is kept alongside `post_id` so a report survives the post
-- being deleted from under it.
CREATE TABLE IF NOT EXISTS report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    post_id UUID REFERENCES post(id) ON DELETE SET NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'nudity', 'violence', 'other')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (reporter_id <> reported_user_id)
);

-- -----------------------------------------------------------------------------
-- Unique @handles (Phase 6)
-- -----------------------------------------------------------------------------

-- `name` is free text and not unique, so two people with the same name were
-- indistinguishable in search. The handle is the stable, unique identifier.
ALTER TABLE APP_USER ADD COLUMN IF NOT EXISTS HANDLE TEXT;

CREATE OR REPLACE FUNCTION public.generate_handle(base_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    slug text;
    candidate text;
    suffix int := 0;
BEGIN
    slug := lower(coalesce(base_name, ''));
    -- Fold accented characters before stripping, so "Håkan" becomes "hakan".
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

-- Row by row, not one UPDATE: a single statement works from one snapshot, so
-- two identical names would generate the same handle and the unique index below
-- would then fail to build.
DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT id, name FROM public.app_user WHERE handle IS NULL ORDER BY created_at LOOP
        UPDATE public.app_user SET handle = public.generate_handle(r.name) WHERE id = r.id;
    END LOOP;
END $$;

-- Case-insensitive: @Malte and @malte must not be different people.
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_handle_lower ON APP_USER (lower(handle));

ALTER TABLE APP_USER ALTER COLUMN HANDLE SET NOT NULL;

ALTER TABLE APP_USER DROP CONSTRAINT IF EXISTS app_user_handle_format;
ALTER TABLE APP_USER ADD CONSTRAINT app_user_handle_format
    CHECK (HANDLE ~ '^[a-z0-9_]{3,20}$');

-- NOTE: the on_auth_user_created trigger function handle_new_user() was also
-- updated to mint a handle at signup via generate_handle(). See the Supabase
-- dashboard, or migration add_user_handle.

-- -----------------------------------------------------------------------------
-- Social: block table (Phase 6)
-- -----------------------------------------------------------------------------

-- Mirrors the shape of `follows`: one row per direction, self-block prevented.
-- Blocking is mutual in the app — see SocialService.blockUser, which also drops
-- any follow in either direction at block time.
CREATE TABLE IF NOT EXISTS block (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

-- -----------------------------------------------------------------------------
-- Workout sharing: browse/copy/follow public workouts (Phase 4, partial)
-- -----------------------------------------------------------------------------

ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS source_workout_id UUID REFERENCES WORKOUT(ID) ON DELETE SET NULL;
ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS link_type TEXT CHECK (link_type IN ('copy', 'follow'));
ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS copy_count INTEGER NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- Workout discovery: follower counts + ratings (workout-rework-plan.md Phase A)
-- -----------------------------------------------------------------------------

ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2);
ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS workout_rating (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES WORKOUT(ID) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 0 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workout_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Images: post photo column + Storage bucket/policies (image-upload-plan.md Phase A/D)
-- -----------------------------------------------------------------------------

ALTER TABLE post ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Public-read bucket for avatars (avatars/{userId}/avatar.jpg) and post photos
-- (posts/{userId}/{timestamp}.jpg). userId must be an actual folder segment (not
-- baked into the filename) in both cases, since the policies below key off
-- (storage.foldername(name))[2], and storage.foldername() only returns folder
-- segments, not the filename. Writes are restricted to a user's own folder.
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-content', 'user-content', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own content" ON storage.objects;
CREATE POLICY "Users can upload their own content"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'user-content'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their own content" ON storage.objects;
CREATE POLICY "Users can update their own content"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'user-content'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own content" ON storage.objects;
CREATE POLICY "Users can delete their own content"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'user-content'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Required even though the bucket is public: storage-js always uploads via
-- INSERT ... ON CONFLICT ... RETURNING *, and under RLS a RETURNING clause needs
-- a satisfying SELECT policy on the row, not just the INSERT/UPDATE policy - without
-- this, every upload fails with "new row violates row-level security policy" even
-- when the INSERT's own WITH CHECK passes.
DROP POLICY IF EXISTS "Public read access to user content" ON storage.objects;
CREATE POLICY "Public read access to user content"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS IDX_EXERCISE_USER_ID ON EXERCISE(EXE_USER_ID);
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_USER_ID ON WORKOUT(WOR_USER_ID);
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_EXERCISE_WORKOUT_ID ON WORKOUT_EXERCISE(WORKOUT_ID);
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_EXERCISE_EXERCISE_ID ON WORKOUT_EXERCISE(EXERCISE_ID);
CREATE INDEX IF NOT EXISTS IDX_EXERCISE_HISTORY_EXERCISE_ID ON EXERCISE_HISTORY(EXERCISE_ID);
CREATE INDEX IF NOT EXISTS IDX_EXERCISE_HISTORY_DATE ON EXERCISE_HISTORY(EXH_DATE);
CREATE INDEX IF NOT EXISTS IDX_SET_EXERCISE_HISTORY_ID ON SET(EXERCISE_HISTORY_ID);
CREATE INDEX IF NOT EXISTS IDX_SPLIT_USER_ID ON split(user_id);
CREATE INDEX IF NOT EXISTS IDX_SPLIT_DAY_SPLIT_ID ON split_day(split_id);
CREATE INDEX IF NOT EXISTS IDX_SPLIT_WEEK_SPLIT_ID ON split_week(split_id);
CREATE INDEX IF NOT EXISTS IDX_FOLLOWS_FOLLOWER_ID ON follows(follower_id);
CREATE INDEX IF NOT EXISTS IDX_FOLLOWS_FOLLOWING_ID ON follows(following_id);
CREATE INDEX IF NOT EXISTS IDX_POST_USER_ID ON post(user_id);
CREATE INDEX IF NOT EXISTS IDX_POST_CREATED_AT ON post(created_at DESC);
CREATE INDEX IF NOT EXISTS IDX_REACTION_POST_ID ON reaction(post_id);
CREATE INDEX IF NOT EXISTS IDX_REACTION_USER_ID ON reaction(user_id);
CREATE INDEX IF NOT EXISTS IDX_COMMENT_POST_ID ON comment(post_id);
CREATE INDEX IF NOT EXISTS IDX_COMMENT_PARENT_COMMENT_ID ON comment(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS IDX_COMMENT_REACTION_COMMENT_ID ON comment_reaction(comment_id);
CREATE INDEX IF NOT EXISTS IDX_COMMENT_REACTION_USER_ID ON comment_reaction(user_id);
CREATE INDEX IF NOT EXISTS IDX_REPORT_REPORTED_USER_ID ON report(reported_user_id);
CREATE INDEX IF NOT EXISTS IDX_REPORT_CREATED_AT ON report(created_at DESC);
CREATE INDEX IF NOT EXISTS IDX_BLOCK_BLOCKER_ID ON block(blocker_id);
CREATE INDEX IF NOT EXISTS IDX_BLOCK_BLOCKED_ID ON block(blocked_id);
CREATE INDEX IF NOT EXISTS IDX_NOTIFICATION_RECIPIENT_ID ON notification(recipient_id);
CREATE INDEX IF NOT EXISTS IDX_NOTIFICATION_RECIPIENT_UNREAD ON notification(recipient_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS IDX_NOTIFICATION_CREATED_AT ON notification(created_at DESC);
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_SOURCE_WORKOUT_ID ON WORKOUT(source_workout_id);
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_IS_PUBLIC ON WORKOUT(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_FOLLOWER_COUNT ON WORKOUT(follower_count DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_AVG_RATING ON WORKOUT(avg_rating DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_RATING_WORKOUT_ID ON workout_rating(workout_id);
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_RATING_USER_ID ON workout_rating(user_id);

-- -----------------------------------------------------------------------------
-- Realtime: notification table (Phase 3 unread badge)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'notification'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notification;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Row Level Security (optional — uncomment to enable)
-- -----------------------------------------------------------------------------

-- ALTER TABLE EXERCISE ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE WORKOUT ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE WORKOUT_EXERCISE ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE EXERCISE_HISTORY ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE SET ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE split ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE split_day ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE split_week ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view their own exercises" ON EXERCISE
--     FOR SELECT USING (auth.uid()::uuid = EXE_USER_ID);

-- CREATE POLICY "Users can view their own workouts" ON WORKOUT
--     FOR SELECT USING (auth.uid()::uuid = WOR_USER_ID);
