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
-- Workout sharing: browse/copy/follow public workouts (Phase 4, partial)
-- -----------------------------------------------------------------------------

ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS source_workout_id UUID REFERENCES WORKOUT(ID) ON DELETE SET NULL;
ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS link_type TEXT CHECK (link_type IN ('copy', 'follow'));
ALTER TABLE WORKOUT ADD COLUMN IF NOT EXISTS copy_count INTEGER NOT NULL DEFAULT 0;

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
CREATE INDEX IF NOT EXISTS IDX_NOTIFICATION_RECIPIENT_ID ON notification(recipient_id);
CREATE INDEX IF NOT EXISTS IDX_NOTIFICATION_RECIPIENT_UNREAD ON notification(recipient_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS IDX_NOTIFICATION_CREATED_AT ON notification(created_at DESC);
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_SOURCE_WORKOUT_ID ON WORKOUT(source_workout_id);
CREATE INDEX IF NOT EXISTS IDX_WORKOUT_IS_PUBLIC ON WORKOUT(is_public) WHERE is_public = true;

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
