# Firebase to Supabase Data Migration Guide

## Overview

This guide will help you migrate all your data from Firebase Firestore to Supabase PostgreSQL. The migration handles the actual Firebase structure with subcollections and converts it to Supabase's relational schema.

**Firebase Structure:**
- Top-level collections: `User`, `Exercise`, `Exercise_history`, `Workout`, `Split`
- Subcollections: 
  - `Workout/{docId}/workout_exercise`
  - `Exercise_history/{docId}/sets`
  - `Split/{docId}/Split_week/{weekId}/{dayName}`

**Supabase Structure:**
- Flat tables with foreign key relationships
- Tables: `app_user`, `exercise`, `exercise_history`, `set`, `workout`, `workout_exercise`, `split`, `day`

## Prerequisites

1. **Supabase Project**: Tables created (run `supabase-migration.sql`)
2. **Firebase Project**: Access to Firestore database
3. **Node.js**: Version 14+
4. **Environment Variables**: Configure both services

## Step-by-Step Migration Process

### Step 1: Backup Your Data

```bash
firebase firestore:export ./firestore-backup
```

### Step 2: Prepare Environment Variables

Create `.env.migration`:

```env
# Firebase Credentials (from firebaseConfig.js)
FIREBASE_API_KEY=AIzaSyC-OSX8UpUaTAHOANXXSMkhMVEsB0A522Y
FIREBASE_AUTH_DOMAIN=gymbroapi.firebaseapp.com
FIREBASE_PROJECT_ID=gymbroapi
FIREBASE_STORAGE_BUCKET=gymbroapi.appspot.com
FIREBASE_MESSAGING_SENDER_ID=101860006838
FIREBASE_APP_ID=1:101860006838:web:6ac517d4caf51c70c4bf17

# Supabase (use service role key!)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **⚠️ Important**: Use **Service Role Key**, not Anon Key. Find it in Supabase → Settings → API.

### Step 3: Install Dependencies

```bash
npm install --save-dev dotenv firebase @supabase/supabase-js
```

### Step 4: Run Migration

```bash
node migrate-firebase-to-supabase.js
```

The script will:
1. ✅ Fetch all users from Firebase
2. ✅ Create users in Supabase
3. ✅ Migrate exercises with all metadata
4. ✅ Migrate exercise history and sets (from subcollection)
5. ✅ Migrate workouts with exercises
6. ✅ Migrate splits and days (flattening the nested structure)
7. ✅ Show detailed progress and summary

### Step 5: Verify Migration

```bash
node verify-migration.js
```

Expected output shows record counts matching between Firebase and Supabase.

### Step 6: Backup and Switch

Once verified:
1. Keep Firebase for fallback (1-2 weeks)
2. Monitor Supabase logs for errors
3. Test app thoroughly with Supabase
4. Delete Firebase data when confident

## Data Mapping

| Firebase Collection | Fields | Supabase Table | Notes |
|---|---|---|---|
| `User` | `usr_token` (ID), `usr_name` | `app_user` | Token becomes UUID |
| `Exercise` | `exe_usr_id`, `exe_name`, `exe_date`, `exe_max_reps`, `exe_max_weight` | `exercise` | Links to app_user |
| `Exercise_history` | `exh_usr_id`, `exh_exe_id`, `exh_date`, `exh_comment` | `exercise_history` | Top-level collection |
| `Exercise_history/.../sets` | `set_weight`, `set_reps`, `set_order` | `set` | Nested subcollection |
| `Workout` | `wor_usr_id`, `wor_name`, `wor_completed_count`, `wor_estimate_time`, `wor_last_done` | `workout` | Links to app_user |
| `Workout/.../workout_exercise` | `woe_exercise`, `woe_ordinal` | `workout_exercise` | Join table |
| `Split` | `spl_usr_id`, `spl_ref_week`, `spl_length` | `split` | Links to app_user |
| `Split/.../Split_week/.../Days` | `swk_wor_id`, `swk_completed`, day_name | `day` | Flattened nested days |

## Firebase Data Structure

```
User/
  {userId}/
    usr_name: "John Doe"
    usr_token: "userId"
    
Exercise/
  {exerciseId}/
    exe_name: "Bench Press"
    exe_usr_id: "userId"
    exe_date: Timestamp
    exe_max_reps: 10
    exe_max_weight: 100.5

Exercise_history/
  {historyId}/
    exh_usr_id: "userId"
    exh_exe_id: "exerciseId"
    exh_date: Timestamp
    exh_comment: "felt good"
    sets/ (Subcollection)
      {setId}/
        set_weight: 100
        set_reps: 10
        set_order: 1

Workout/
  {workoutId}/
    wor_usr_id: "userId"
    wor_name: "Chest Day"
    wor_completed_count: 5
    wor_estimate_time: 45
    wor_last_done: Timestamp
    workout_exercise/ (Subcollection)
      {woeId}/
        woe_exercise: "exerciseId"
        woe_ordinal: 0

Split/
  {splitId}/
    spl_usr_id: "userId"
    spl_ref_week: 1
    spl_length: 5
    Split_week/ (Subcollection)
      {weekId}/
        ordinal: 0
        Monday/ (Day subcollection)
          {dayId}/
            swk_wor_id: "workoutId"
            swk_completed: false
        Tuesday/, Wednesday/, etc.
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Permission denied" | Use Service Role Key, not Anon Key |
| "Duplicate key" errors | Drop Supabase tables, recreate with supabase-migration.sql |
| Foreign key errors | Ensure parent records exist (script handles order) |
| Firebase credentials invalid | Check .env.migration file paths |
| Missing subcollections | Script fetches nested data recursively |

## Rollback Plan

If issues occur:

```bash
# Keep Firebase as fallback
# Drop Supabase tables
DROP TABLE IF EXISTS day CASCADE;
DROP TABLE IF EXISTS split CASCADE;
DROP TABLE IF EXISTS workout_exercise CASCADE;
DROP TABLE IF EXISTS exercise_history CASCADE;
DROP TABLE IF EXISTS "set" CASCADE;
DROP TABLE IF EXISTS workout CASCADE;
DROP TABLE IF EXISTS exercise CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;

# Recreate schema
# (run supabase-migration.sql)

# Fix migration script and retry
```

Your Firebase data remains completely safe throughout!

## Next Steps After Migration

1. **Test all features** in app with Supabase
2. **Monitor logs** for errors
3. **Check performance** - PostgreSQL queries should be fast
4. **Keep Firebase** as fallback for 1-2 weeks
5. **Delete Firebase** data once confident
6. **Remove migration** files and dependencies

## Need Help?

- Check migration script logs for specific errors
- Review Supabase logs: Dashboard → Logs
- Verify all environment variables are correct
- Ensure Firebase and Supabase credentials are valid
- Run verification script to compare data counts
