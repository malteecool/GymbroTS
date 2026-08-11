-- =============================================================================
-- GymbroTS Mock Data
-- For development/testing only. Run against a non-production database.
-- Uses fixed UUIDs so references are stable and re-running is predictable.
-- Wrap in a transaction so it either fully applies or fully rolls back.
--
-- Test credentials (all three users):
--   Password: MockPass123!
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Clean up any previous mock data (safe re-run)
-- -----------------------------------------------------------------------------

DELETE FROM follows         WHERE follower_id  IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003');
DELETE FROM notification    WHERE recipient_id IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003') OR actor_id IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003');
DELETE FROM comment         WHERE user_id      IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003');
DELETE FROM reaction        WHERE user_id      IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003');
DELETE FROM post            WHERE user_id      IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003');
DELETE FROM split_week      WHERE split_id     IN (SELECT id FROM split WHERE user_id IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003'));
DELETE FROM split_day       WHERE split_id     IN (SELECT id FROM split WHERE user_id IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003'));
DELETE FROM split           WHERE user_id      IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003');
DELETE FROM set             WHERE exercise_history_id IN (SELECT id FROM exercise_history WHERE exercise_id IN (SELECT id FROM exercise WHERE exe_user_id IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003')));
DELETE FROM exercise_history WHERE exercise_id IN (SELECT id FROM exercise WHERE exe_user_id IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003'));
DELETE FROM workout_exercise WHERE workout_id  IN (SELECT id FROM workout WHERE wor_user_id IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003'));
DELETE FROM workout         WHERE wor_user_id  IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003');
DELETE FROM exercise        WHERE exe_user_id  IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003');
DELETE FROM app_user        WHERE id           IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003');
DELETE FROM auth.users      WHERE id           IN ('a0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000003');

-- -----------------------------------------------------------------------------
-- Auth users (required before app_user due to foreign key)
-- Password for all accounts: MockPass123!
-- crypt() requires the pgcrypto extension, which is enabled by default in Supabase.
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_user_meta_data
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000001-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'alex@mock.test',
    crypt('MockPass123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"name": "Alex Lifter"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000001-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'jordan@mock.test',
    crypt('MockPass123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"name": "Jordan Gains"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000001-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'sam@mock.test',
    crypt('MockPass123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"name": "Sam Cardio"}'
  );

-- -----------------------------------------------------------------------------
-- Users
-- -----------------------------------------------------------------------------

-- auth.users insert above fires a trigger that auto-creates a matching app_user
-- row, so this upserts on top of it rather than assuming a plain INSERT is safe.
INSERT INTO app_user (id, name, bio, is_public) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Alex Lifter',   'PPL bro. Bench is life.', true),
  ('a0000001-0000-0000-0000-000000000002', 'Jordan Gains',  'Powerlifting & coffee.',   true),
  ('a0000001-0000-0000-0000-000000000003', 'Sam Cardio',    NULL,                      false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  bio = EXCLUDED.bio,
  is_public = EXCLUDED.is_public;

-- -----------------------------------------------------------------------------
-- Exercises — Alex
-- -----------------------------------------------------------------------------

INSERT INTO exercise (id, exe_name, exe_user_id, exe_date, exe_max_weight, exe_max_reps) VALUES
  ('e1000001-0000-0000-0000-000000000001', 'Bench Press',      'a0000001-0000-0000-0000-000000000001', NOW(), 100.00, 8),
  ('e1000001-0000-0000-0000-000000000002', 'Overhead Press',   'a0000001-0000-0000-0000-000000000001', NOW(),  70.00, 8),
  ('e1000001-0000-0000-0000-000000000003', 'Squat',            'a0000001-0000-0000-0000-000000000001', NOW(), 140.00, 5),
  ('e1000001-0000-0000-0000-000000000004', 'Deadlift',         'a0000001-0000-0000-0000-000000000001', NOW(), 180.00, 3),
  ('e1000001-0000-0000-0000-000000000005', 'Pull-up',          'a0000001-0000-0000-0000-000000000001', NOW(),  NULL,  12),
  ('e1000001-0000-0000-0000-000000000006', 'Tricep Pushdown',  'a0000001-0000-0000-0000-000000000001', NOW(),  40.00, 12),
  ('e1000001-0000-0000-0000-000000000007', 'Barbell Row',      'a0000001-0000-0000-0000-000000000001', NOW(),  90.00, 8);

-- Exercises — Jordan
INSERT INTO exercise (id, exe_name, exe_user_id, exe_date, exe_max_weight, exe_max_reps) VALUES
  ('e2000001-0000-0000-0000-000000000001', 'Low Bar Squat',    'a0000001-0000-0000-0000-000000000002', NOW(), 200.00, 3),
  ('e2000001-0000-0000-0000-000000000002', 'Sumo Deadlift',    'a0000001-0000-0000-0000-000000000002', NOW(), 220.00, 2),
  ('e2000001-0000-0000-0000-000000000003', 'Paused Bench',     'a0000001-0000-0000-0000-000000000002', NOW(), 120.00, 5),
  ('e2000001-0000-0000-0000-000000000004', 'Romanian Deadlift','a0000001-0000-0000-0000-000000000002', NOW(), 130.00, 8);

-- Exercises — Sam
INSERT INTO exercise (id, exe_name, exe_user_id, exe_date, exe_max_weight, exe_max_reps) VALUES
  ('e3000001-0000-0000-0000-000000000001', 'Treadmill Run',    'a0000001-0000-0000-0000-000000000003', NOW(), NULL,   NULL),
  ('e3000001-0000-0000-0000-000000000002', 'Cycling',          'a0000001-0000-0000-0000-000000000003', NOW(), NULL,   NULL);

-- -----------------------------------------------------------------------------
-- Workouts — Alex (PPL split)
-- -----------------------------------------------------------------------------

INSERT INTO workout (id, wor_name, wor_user_id, wor_completed_count, wor_estimate_time, wor_last_done) VALUES
  ('d1000001-0000-0000-0000-000000000001', 'Push A', 'a0000001-0000-0000-0000-000000000001', 12, 60, NOW() - INTERVAL '2 days'),
  ('d1000001-0000-0000-0000-000000000002', 'Pull A', 'a0000001-0000-0000-0000-000000000001',  9, 55, NOW() - INTERVAL '4 days'),
  ('d1000001-0000-0000-0000-000000000003', 'Legs A', 'a0000001-0000-0000-0000-000000000001',  8, 70, NOW() - INTERVAL '6 days');

-- Workouts — Jordan (powerlifting)
INSERT INTO workout (id, wor_name, wor_user_id, wor_completed_count, wor_estimate_time, wor_last_done) VALUES
  ('d2000001-0000-0000-0000-000000000001', 'Squat Day',     'a0000001-0000-0000-0000-000000000002', 20, 90, NOW() - INTERVAL '1 day'),
  ('d2000001-0000-0000-0000-000000000002', 'Deadlift Day',  'a0000001-0000-0000-0000-000000000002', 18, 85, NOW() - INTERVAL '3 days'),
  ('d2000001-0000-0000-0000-000000000003', 'Bench Day',     'a0000001-0000-0000-0000-000000000002', 22, 75, NOW() - INTERVAL '5 days');

-- Workouts — Sam
INSERT INTO workout (id, wor_name, wor_user_id, wor_completed_count, wor_estimate_time, wor_last_done) VALUES
  ('d3000001-0000-0000-0000-000000000001', 'Cardio Session', 'a0000001-0000-0000-0000-000000000003', 5, 45, NOW() - INTERVAL '1 day');

-- -----------------------------------------------------------------------------
-- Workout exercises (exercises inside each workout)
-- -----------------------------------------------------------------------------

-- Push A: Bench, OHP, Tricep Pushdown
INSERT INTO workout_exercise (woe_id, workout_id, exercise_id, ordinal) VALUES
  (gen_random_uuid(), 'd1000001-0000-0000-0000-000000000001', 'e1000001-0000-0000-0000-000000000001', 1),
  (gen_random_uuid(), 'd1000001-0000-0000-0000-000000000001', 'e1000001-0000-0000-0000-000000000002', 2),
  (gen_random_uuid(), 'd1000001-0000-0000-0000-000000000001', 'e1000001-0000-0000-0000-000000000006', 3);

-- Pull A: Pull-up, Barbell Row
INSERT INTO workout_exercise (woe_id, workout_id, exercise_id, ordinal) VALUES
  (gen_random_uuid(), 'd1000001-0000-0000-0000-000000000002', 'e1000001-0000-0000-0000-000000000005', 1),
  (gen_random_uuid(), 'd1000001-0000-0000-0000-000000000002', 'e1000001-0000-0000-0000-000000000007', 2);

-- Legs A: Squat, Deadlift
INSERT INTO workout_exercise (woe_id, workout_id, exercise_id, ordinal) VALUES
  (gen_random_uuid(), 'd1000001-0000-0000-0000-000000000003', 'e1000001-0000-0000-0000-000000000003', 1),
  (gen_random_uuid(), 'd1000001-0000-0000-0000-000000000003', 'e1000001-0000-0000-0000-000000000004', 2);

-- Squat Day
INSERT INTO workout_exercise (woe_id, workout_id, exercise_id, ordinal) VALUES
  (gen_random_uuid(), 'd2000001-0000-0000-0000-000000000001', 'e2000001-0000-0000-0000-000000000001', 1),
  (gen_random_uuid(), 'd2000001-0000-0000-0000-000000000001', 'e2000001-0000-0000-0000-000000000004', 2);

-- Deadlift Day
INSERT INTO workout_exercise (woe_id, workout_id, exercise_id, ordinal) VALUES
  (gen_random_uuid(), 'd2000001-0000-0000-0000-000000000002', 'e2000001-0000-0000-0000-000000000002', 1);

-- Bench Day
INSERT INTO workout_exercise (woe_id, workout_id, exercise_id, ordinal) VALUES
  (gen_random_uuid(), 'd2000001-0000-0000-0000-000000000003', 'e2000001-0000-0000-0000-000000000003', 1);

-- Cardio Session
INSERT INTO workout_exercise (woe_id, workout_id, exercise_id, ordinal) VALUES
  (gen_random_uuid(), 'd3000001-0000-0000-0000-000000000001', 'e3000001-0000-0000-0000-000000000001', 1),
  (gen_random_uuid(), 'd3000001-0000-0000-0000-000000000001', 'e3000001-0000-0000-0000-000000000002', 2);

-- -----------------------------------------------------------------------------
-- Exercise history + sets (a few recent sessions for Alex)
-- -----------------------------------------------------------------------------

INSERT INTO exercise_history (id, exercise_id, exh_date, exh_comment) VALUES
  ('f1000001-0000-0000-0000-000000000001', 'e1000001-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days',  'Felt strong today'),
  ('f1000001-0000-0000-0000-000000000002', 'e1000001-0000-0000-0000-000000000001', NOW() - INTERVAL '9 days',  NULL),
  ('f1000001-0000-0000-0000-000000000003', 'e1000001-0000-0000-0000-000000000003', NOW() - INTERVAL '6 days',  'Heavy day'),
  ('f1000001-0000-0000-0000-000000000004', 'e1000001-0000-0000-0000-000000000004', NOW() - INTERVAL '6 days',  NULL);

-- Sets for bench press session 1
INSERT INTO set (id, exercise_history_id, set_weight, set_reps, set_order) VALUES
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000001',  80.00, 8, 1),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000001',  90.00, 6, 2),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000001', 100.00, 5, 3),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000001', 100.00, 4, 4);

-- Sets for bench press session 2
INSERT INTO set (id, exercise_history_id, set_weight, set_reps, set_order) VALUES
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000002',  80.00, 8, 1),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000002',  90.00, 6, 2),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000002',  95.00, 5, 3);

-- Sets for squat session
INSERT INTO set (id, exercise_history_id, set_weight, set_reps, set_order) VALUES
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000003', 120.00, 5, 1),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000003', 130.00, 5, 2),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000003', 140.00, 4, 3);

-- Sets for deadlift session
INSERT INTO set (id, exercise_history_id, set_weight, set_reps, set_order) VALUES
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000004', 160.00, 3, 1),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000004', 170.00, 3, 2),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000004', 180.00, 2, 3);

-- -----------------------------------------------------------------------------
-- Follows (to test the social layer)
-- Jordan follows Alex, Sam follows Alex
-- -----------------------------------------------------------------------------

INSERT INTO follows (follower_id, following_id) VALUES
  ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001'),
  ('a0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001');

-- -----------------------------------------------------------------------------
-- Posts (workout shares)
-- -----------------------------------------------------------------------------

INSERT INTO post (id, user_id, workout_id, post_type, caption, is_public, created_at) VALUES
  ('b1000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001', 'workout_complete', 'Crushed push day 💪',              true, NOW() - INTERVAL '2 days'),
  ('b1000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000003', 'pr_broken',        'New squat PR: 140kg x5!',          true, NOW() - INTERVAL '6 days'),
  ('b1000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 'd2000001-0000-0000-0000-000000000001', 'workout_complete', 'Squat day done, feeling heavy',    true, NOW() - INTERVAL '1 day'),
  ('b1000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000002', 'd2000001-0000-0000-0000-000000000002', 'milestone',        '18th deadlift session in the books', true, NOW() - INTERVAL '3 days'),
  ('b1000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003', 'd3000001-0000-0000-0000-000000000001', 'workout_complete', '5k done, legs are jelly',          true, NOW() - INTERVAL '1 day');

-- -----------------------------------------------------------------------------
-- Reactions (likes)
-- -----------------------------------------------------------------------------

INSERT INTO reaction (post_id, user_id) VALUES
  ('b1000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002'), -- Jordan likes Alex's push day post
  ('b1000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003'), -- Sam likes Alex's push day post
  ('b1000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002'), -- Jordan likes Alex's PR post
  ('b1000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001'); -- Alex likes Jordan's squat day post

-- -----------------------------------------------------------------------------
-- Comments
-- -----------------------------------------------------------------------------

INSERT INTO comment (id, post_id, user_id, body, created_at) VALUES
  ('c1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'Beast mode! 🔥',       NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
  ('c1000001-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'Nice work!',           NOW() - INTERVAL '2 days' + INTERVAL '3 hours'),
  ('c1000001-0000-0000-0000-000000000003', 'b1000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'PR king 👑',           NOW() - INTERVAL '6 days' + INTERVAL '2 hours'),
  ('c1000001-0000-0000-0000-000000000004', 'b1000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'Let''s go Jordan!',    NOW() - INTERVAL '1 day'  + INTERVAL '30 minutes');

-- -----------------------------------------------------------------------------
-- Notifications (mirrors the follows/reactions/comments above)
-- -----------------------------------------------------------------------------

INSERT INTO notification (recipient_id, actor_id, post_id, notif_type, is_read, created_at) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', NULL,                                    'follow',  true,  NOW() - INTERVAL '10 days'),
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', NULL,                                    'follow',  true,  NOW() - INTERVAL '9 days'),
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000001', 'like',    false, NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'b1000001-0000-0000-0000-000000000001', 'like',    false, NOW() - INTERVAL '2 days' + INTERVAL '20 minutes'),
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000002', 'like',    false, NOW() - INTERVAL '6 days' + INTERVAL '10 minutes'),
  ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000003', 'like',    false, NOW() - INTERVAL '1 day'  + INTERVAL '10 minutes'),
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000001', 'comment', false, NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'b1000001-0000-0000-0000-000000000001', 'comment', false, NOW() - INTERVAL '2 days' + INTERVAL '3 hours'),
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000002', 'comment', false, NOW() - INTERVAL '6 days' + INTERVAL '2 hours'),
  ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000003', 'comment', true,  NOW() - INTERVAL '1 day'  + INTERVAL '30 minutes');

COMMIT;
