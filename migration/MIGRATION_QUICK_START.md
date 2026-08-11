# Firebase to Supabase Migration - Quick Start

## 5-Minute Setup

### 1. Create `.env.migration` 

Copy your Firebase credentials from `firebaseConfig.js` and Supabase from dashboard:

```env
# From firebaseConfig.js
FIREBASE_API_KEY=AIzaSyC-OSX8UpUaTAHOANXXSMkhMVEsB0A522Y
FIREBASE_AUTH_DOMAIN=gymbroapi.firebaseapp.com
FIREBASE_PROJECT_ID=gymbroapi
FIREBASE_STORAGE_BUCKET=gymbroapi.appspot.com
FIREBASE_MESSAGING_SENDER_ID=101860006838
FIREBASE_APP_ID=1:101860006838:web:6ac517d4caf51c70c4bf17

# Get from Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> ⚠️ **IMPORTANT**: Use **Service Role Key** (not Anon Key!) from Supabase Settings → API

### 2. Install Dependencies
```bash
npm install --save-dev dotenv firebase @supabase/supabase-js
```

### 3. Backup Firebase (Optional)
```bash
firebase firestore:export ./firestore-backup
```

### 4. Run Migration
```bash
node migrate-firebase-to-supabase.js
```

Expected output:
```
📍 Starting Firebase to Supabase Migration
📍 Fetching users from Firebase...
✅ Found 3 users
✅ Migrated user: John Doe
✅ Migrating exercises...
✅ Migrating exercise history...
✅ Migrating sets...
✅ Migrating workouts...
✅ Migrating workout exercises...
✅ Migrating splits...
✅ Migrating days...

Migration Summary
✅ Users: 3
✅ Exercises: 45
✅ Exercise History: 250
✅ Sets: 1200
✅ Workouts: 8
✅ Workout Exercises: 42
✅ Splits: 2
✅ Days: 14

✨ Migration completed successfully!
```

### 5. Verify Results
```bash
node verify-migration.js
```

### 6. Check Data in Supabase
Go to Supabase Dashboard → Tables → Check each table for data

## Data Structure Handled

The migration script handles:

✅ **User Collection** → `app_user` table  
✅ **Exercise Collection** → `exercise` table  
✅ **Exercise_history Collection** → `exercise_history` table  
✅ **Exercise_history/.../sets Subcollection** → `set` table  
✅ **Workout Collection** → `workout` table  
✅ **Workout/.../workout_exercise Subcollection** → `workout_exercise` table  
✅ **Split Collection** → `split` table  
✅ **Split/.../Split_week/.../Days Subcollections** → `day` table (flattened)  

## Field Mapping

```
User.usr_token          → app_user.id
User.usr_name           → app_user.name

Exercise.exe_name       → exercise.exe_name
Exercise.exe_usr_id     → exercise.exe_user_id
Exercise.exe_date       → exercise.exe_date
Exercise.exe_max_reps   → exercise.exe_max_reps
Exercise.exe_max_weight → exercise.exe_max_weight

Exercise_history.exh_exe_id    → exercise_history.exercise_id
Exercise_history.exh_date      → exercise_history.exh_date
Exercise_history.exh_comment   → exercise_history.exh_comment
Exercise_history/sets          → Converted to set records

Workout.wor_name              → workout.wor_name
Workout.wor_usr_id            → workout.wor_user_id
Workout.wor_completed_count   → workout.wor_completed_count
Workout.wor_estimate_time     → workout.wor_estimate_time
Workout.wor_last_done         → workout.wor_last_done
Workout/workout_exercise      → Linked via workout_exercise table

Split.spl_usr_id        → split.user_id
Split.spl_ref_week      → split.spl_ref_week
Split/Split_week        → Referenced in day table
Split/.../Days          → Flattened to day table with day_name
```

## Verify Success

Run verification script:
```bash
node verify-migration.js
```

This compares record counts between Firebase and Supabase.

Or manually check in Supabase SQL:
```sql
SELECT 'app_user' as table_name, COUNT(*) as count FROM app_user
UNION ALL SELECT 'exercise', COUNT(*) FROM exercise
UNION ALL SELECT 'exercise_history', COUNT(*) FROM exercise_history
UNION ALL SELECT 'set', COUNT(*) FROM "set"
UNION ALL SELECT 'workout', COUNT(*) FROM workout
UNION ALL SELECT 'workout_exercise', COUNT(*) FROM workout_exercise
UNION ALL SELECT 'split', COUNT(*) FROM split
UNION ALL SELECT 'day', COUNT(*) FROM day;
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `service_role_key is missing` | Use Service Role Key, not Anon Key |
| `Duplicate key error` | Drop tables in Supabase and recreate with `supabase-migration.sql` |
| `Firebase credentials invalid` | Check `.env.migration` values match `firebaseConfig.js` |
| Foreign key errors | Script inserts in correct order - may mean data in Firebase is inconsistent |
| Migration hangs | Check network - may be fetching large amounts of data |

## After Migration

1. **Test thoroughly** - run your app with Supabase
2. **Keep Firebase active** for 1-2 weeks as fallback
3. **Monitor logs** - check Supabase dashboard for errors
4. **Delete Firebase** once confident
5. **Remove migration files** and dependencies:
   ```bash
   npm uninstall --save-dev dotenv firebase
   rm migrate-firebase-to-supabase.js verify-migration.js
   rm .env.migration
   ```

## Firebase stays safe

Your original Firebase data is not modified or deleted during migration. You control when/if to delete it.
