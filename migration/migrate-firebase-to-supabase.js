#!/usr/bin/env node

/**
 * Firebase to Supabase Data Migration Script
 * 
 * Migrates from GymbroTS Firebase structure to Supabase, handling:
 * - Top-level collections: User, Exercise, Exercise_history, Workout, Split
 * - Subcollections: workout_exercise, sets, Split_week/days
 * 
 * Usage: node migrate-firebase-to-supabase.js
 */

require('dotenv').config({ path: '.env.migration' });
const { initializeApp } = require('firebase/app');
const { 
    getFirestore, 
    collection, 
    getDocs, 
    query, 
    where,
    doc,
    getDoc
} = require('firebase/firestore');
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// INITIALIZE FIREBASE
// ============================================================================

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseDb = getFirestore(firebaseApp);

// ============================================================================
// INITIALIZE SUPABASE
// ============================================================================

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// STATISTICS & ID MAPPING
// ============================================================================

const stats = {
    users: 0,
    exercises: 0,
    exerciseHistory: 0,
    sets: 0,
    workouts: 0,
    workoutExercises: 0,
    splits: 0,
    days: 0,
    errors: [],
};

// ID Mapping: Firebase ID -> Supabase UUID
const idMaps = {
    users: {},           // firebaseUserId -> supabaseUserId
    exercises: {},       // firebaseExerciseId -> supabaseExerciseId
    exerciseHistory: {}, // firebaseHistoryId -> supabaseHistoryId
    workouts: {},        // firebaseWorkoutId -> supabaseWorkoutId
    splits: {},          // firebaseSplitId -> supabaseSplitId
};

// ============================================================================
// HELPERS
// ============================================================================

const log = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const icons = { info: 'ℹ️ ', success: '✅ ', warning: '⚠️ ', error: '❌ ', step: '📍 ' };
    console.log(`${icons[type] || ''}[${timestamp}] ${message}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const logError = (collection, id, error) => {
    const errorMsg = `${collection}/${id}: ${error.message}`;
    stats.errors.push(errorMsg);
    log(errorMsg, 'error');
};

const firebaseTimestampToISO = (fbTimestamp) => {
    if (!fbTimestamp) return new Date().toISOString();
    if (typeof fbTimestamp.toDate === 'function') {
        return fbTimestamp.toDate().toISOString();
    }
    return new Date().toISOString();
};

// ============================================================================
// FIREBASE DATA FETCHERS
// ============================================================================

async function fetchAllUsers() {
    try {
        log('Fetching users from Firebase...', 'step');
        const usersRef = collection(firebaseDb, 'User');
        const snapshot = await getDocs(usersRef);
        const users = [];

        snapshot.forEach((doc) => {
            users.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        log(`Found ${users.length} users`, 'success');
        return users;
    } catch (error) {
        log(`Failed to fetch users: ${error.message}`, 'error');
        throw error;
    }
}

async function fetchExercises(userId) {
    try {
        const exercisesRef = collection(firebaseDb, 'Exercise');
        const q = query(exercisesRef, where('exe_usr_id', '==', userId));
        const snapshot = await getDocs(q);
        const exercises = [];

        snapshot.forEach((doc) => {
            exercises.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return exercises;
    } catch (error) {
        log(`Failed to fetch exercises for user ${userId}: ${error.message}`, 'error');
        return [];
    }
}

async function fetchExerciseHistoryForUser(userId) {
    try {
        const historyRef = collection(firebaseDb, 'Exercise_history');
        const q = query(historyRef, where('exh_usr_id', '==', userId));
        const snapshot = await getDocs(q);
        const history = [];

        snapshot.forEach((doc) => {
            history.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return history;
    } catch (error) {
        log(`Failed to fetch exercise history for user ${userId}: ${error.message}`, 'error');
        return [];
    }
}

async function fetchSetsForHistory(exerciseHistoryId) {
    try {
        const setsRef = collection(firebaseDb, 'Exercise_history', exerciseHistoryId, 'sets');
        const snapshot = await getDocs(setsRef);
        const sets = [];

        snapshot.forEach((doc) => {
            sets.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return sets;
    } catch (error) {
        log(`Failed to fetch sets for history ${exerciseHistoryId}: ${error.message}`, 'warning');
        return [];
    }
}

async function fetchWorkouts(userId) {
    try {
        const workoutsRef = collection(firebaseDb, 'Workout');
        const q = query(workoutsRef, where('wor_usr_id', '==', userId));
        const snapshot = await getDocs(q);
        const workouts = [];

        snapshot.forEach((doc) => {
            workouts.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return workouts;
    } catch (error) {
        log(`Failed to fetch workouts for user ${userId}: ${error.message}`, 'error');
        return [];
    }
}

async function fetchWorkoutExercises(workoutId) {
    try {
        const woeRef = collection(firebaseDb, 'Workout', workoutId, 'workout_exercise');
        const snapshot = await getDocs(woeRef);
        const workoutExercises = [];

        snapshot.forEach((doc) => {
            workoutExercises.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return workoutExercises;
    } catch (error) {
        log(`Failed to fetch workout exercises for workout ${workoutId}: ${error.message}`, 'error');
        return [];
    }
}

async function fetchSplits(userId) {
    try {
        const splitsRef = collection(firebaseDb, 'Split');
        const q = query(splitsRef, where('spl_usr_id', '==', userId));
        const snapshot = await getDocs(q);
        const splits = [];

        snapshot.forEach((doc) => {
            splits.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return splits;
    } catch (error) {
        log(`Failed to fetch splits for user ${userId}: ${error.message}`, 'error');
        return [];
    }
}

async function fetchSplitWeeks(splitId) {
    try {
        const weeksRef = collection(firebaseDb, 'Split', splitId, 'Split_week');
        const snapshot = await getDocs(weeksRef);
        const weeks = [];

        snapshot.forEach((doc) => {
            weeks.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return weeks;
    } catch (error) {
        log(`Failed to fetch split weeks for split ${splitId}: ${error.message}`, 'error');
        return [];
    }
}

async function fetchDaysForWeek(splitId, weekId) {
    const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const days = [];

    for (let index = 0; index < WEEK_DAYS.length; index++) {
        const dayName = WEEK_DAYS[index];
        try {
            const daysRef = collection(firebaseDb, 'Split', splitId, 'Split_week', weekId, dayName);
            const snapshot = await getDocs(daysRef);

            snapshot.forEach((doc) => {
                days.push({
                    id: doc.id,
                    day_name: dayName,
                    week_day_index: index,
                    ...doc.data(),
                });
            });
        } catch (error) {
            // Day might be empty, continue
        }
    }

    return days;
}

// ============================================================================
// SUPABASE DATA INSERTION
// ============================================================================

async function insertUsers(users) {
    log('Migrating users...', 'step');

    for (const user of users) {
        try {
            const firebaseUserId = user.usr_token;
            
            const { data, error } = await supabase
                .from('app_user')
                .insert([
                    {
                        name: user.usr_name || 'Unknown',
                        email: user.usr_email || `malte.lindgren11@gmail.com`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ])
                .select();

            if (error) throw error;
            if (!data || !data[0]) throw new Error('No data returned from insert');
            
            const supabaseUserId = data[0].id;
            idMaps.users[firebaseUserId] = supabaseUserId;
            
            stats.users++;
            log(`Migrated user: ${user.usr_name} (${firebaseUserId} → ${supabaseUserId})`, 'success');
        } catch (error) {
            logError('users', user.id || user.usr_token, error);
        }
    }
}

async function insertExercises(exercises) {
    log('Migrating exercises...', 'step');

    for (const exercise of exercises) {
        try {
            const firebaseExerciseId = exercise.id;
            const firebaseUserId = exercise.exe_usr_id;
            const supabaseUserId = idMaps.users[firebaseUserId];
            
            if (!supabaseUserId) {
                throw new Error(`No mapped user ID found for Firebase user ${firebaseUserId}`);
            }
            
            const { data, error } = await supabase
                .from('exercise')
                .insert([
                    {
                        exe_name: exercise.exe_name || 'Unnamed',
                        exe_user_id: supabaseUserId,
                        exe_date: firebaseTimestampToISO(exercise.exe_date),
                        exe_max_reps: exercise.exe_max_reps || null,
                        exe_max_weight: exercise.exe_max_weight || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ])
                .select();

            if (error) throw error;
            if (!data || !data[0]) throw new Error('No data returned from insert');
            
            const supabaseExerciseId = data[0].id;
            idMaps.exercises[firebaseExerciseId] = supabaseExerciseId;
            
            stats.exercises++;
        } catch (error) {
            logError('exercises', exercise.id, error);
        }
    }
}

async function insertExerciseHistory(history) {
    log('Migrating exercise history...', 'step');

    for (const record of history) {
        try {
            const firebaseHistoryId = record.id;
            const firebaseExerciseId = record.exh_exe_id;
            const supabaseExerciseId = idMaps.exercises[firebaseExerciseId];
            
            if (!supabaseExerciseId) {
                throw new Error(`No mapped exercise ID found for Firebase exercise ${firebaseExerciseId}`);
            }
            
            const { data, error } = await supabase
                .from('exercise_history')
                .insert([
                    {
                        exercise_id: supabaseExerciseId,
                        exh_date: firebaseTimestampToISO(record.exh_date),
                        exh_comment: record.exh_comment || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ])
                .select();

            if (error) throw error;
            if (!data || !data[0]) throw new Error('No data returned from insert');
            
            const supabaseHistoryId = data[0].id;
            idMaps.exerciseHistory[firebaseHistoryId] = supabaseHistoryId;
            
            stats.exerciseHistory++;
        } catch (error) {
            logError('exercise_history', record.id, error);
        }
    }
}

async function insertSets(sets) {
    log('Migrating sets...', 'step');

    for (const set of sets) {
        try {
            const firebaseHistoryId = set.exercise_history_id;
            const supabaseHistoryId = idMaps.exerciseHistory[firebaseHistoryId];
            
            if (!supabaseHistoryId) {
                throw new Error(`No mapped history ID found for Firebase history ${firebaseHistoryId}`);
            }
            
            const { error } = await supabase
                .from('set')
                .insert([
                    {
                        exercise_history_id: supabaseHistoryId,
                        set_weight: set.set_weight || 0,
                        set_reps: set.set_reps || 0,
                        set_order: set.set_order || null,
                        created_at: new Date().toISOString(),
                    },
                ])
                .select();

            if (error) throw error;
            stats.sets++;
        } catch (error) {
            logError('sets', set.id, error);
        }
    }
}

async function insertWorkouts(workouts) {
    log('Migrating workouts...', 'step');

    for (const workout of workouts) {
        try {
            const firebaseWorkoutId = workout.id;
            const firebaseUserId = workout.wor_usr_id;
            const supabaseUserId = idMaps.users[firebaseUserId];
            
            if (!supabaseUserId) {
                throw new Error(`No mapped user ID found for Firebase user ${firebaseUserId}`);
            }
            
            const { data, error } = await supabase
                .from('workout')
                .insert([
                    {
                        wor_name: workout.wor_name || 'Unnamed',
                        wor_user_id: supabaseUserId,
                        wor_completed_count: workout.wor_completed_count || 0,
                        wor_estimate_time: workout.wor_estimate_time || null,
                        wor_last_done: firebaseTimestampToISO(workout.wor_last_done),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ])
                .select();

            if (error) throw error;
            if (!data || !data[0]) throw new Error('No data returned from insert');
            
            const supabaseWorkoutId = data[0].id;
            idMaps.workouts[firebaseWorkoutId] = supabaseWorkoutId;
            
            stats.workouts++;
        } catch (error) {
            logError('workouts', workout.id, error);
        }
    }
}

async function insertWorkoutExercises(workoutExercises, firebaseWorkoutId) {
    log('Migrating workout exercises...', 'step');

    const supabaseWorkoutId = idMaps.workouts[firebaseWorkoutId];
    if (!supabaseWorkoutId) {
        log(`No mapped workout ID found for Firebase workout ${firebaseWorkoutId}`, 'warning');
        return;
    }

    for (const woe of workoutExercises) {
        try {
            const firebaseExerciseId = woe.woe_exercise;
            const supabaseExerciseId = idMaps.exercises[firebaseExerciseId];
            
            if (!supabaseExerciseId) {
                throw new Error(`No mapped exercise ID found for Firebase exercise ${firebaseExerciseId}`);
            }
            
            const { error } = await supabase
                .from('workout_exercise')
                .insert([
                    {
                        workout_id: supabaseWorkoutId,
                        exercise_id: supabaseExerciseId,
                        ordinal: woe.woe_ordinal || 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ])
                .select();

            if (error) throw error;
            stats.workoutExercises++;
        } catch (error) {
            logError('workout_exercise', woe.id, error);
        }
    }
}

async function insertSplits(splits) {
    log('Migrating splits...', 'step');

    for (const split of splits) {
        try {
            const firebaseSplitId = split.id;
            const firebaseUserId = split.spl_usr_id;
            const supabaseUserId = idMaps.users[firebaseUserId];
            
            if (!supabaseUserId) {
                throw new Error(`No mapped user ID found for Firebase user ${firebaseUserId}`);
            }
            
            const { data, error } = await supabase
                .from('split')
                .insert([
                    {
                        user_id: supabaseUserId,
                        spl_ref_week: split.spl_ref_week || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ])
                .select();

            if (error) throw error;
            if (!data || !data[0]) throw new Error('No data returned from insert');
            
            const supabaseSplitId = data[0].id;
            idMaps.splits[firebaseSplitId] = supabaseSplitId;
            
            stats.splits++;
        } catch (error) {
            logError('splits', split.id, error);
        }
    }
}

async function insertDays(days, firebaseSplitId) {
    const supabaseSplitId = idMaps.splits[firebaseSplitId];
    if (!supabaseSplitId) {
        log(`No mapped split ID found for Firebase split ${firebaseSplitId}`, 'warning');
        return;
    }

    for (const day of days) {
        try {
            const firebaseWorkoutId = day.swk_wor_id;
            const supabaseWorkoutId = firebaseWorkoutId ? idMaps.workouts[firebaseWorkoutId] : null;
            
            const { error } = await supabase
                .from('day')
                .insert([
                    {
                        split_id: supabaseSplitId,
                        workout_id: supabaseWorkoutId || null,
                        day_name: day.day_name || 'Unknown',
                        completed: day.swk_completed || false,
                        week_day_index: day.week_day_index || 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ])
                .select();

            if (error) throw error;
            stats.days++;
        } catch (error) {
            logError('days', day.id, error);
        }
    }
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function runMigration() {
    log('='.repeat(60), 'step');
    log('Starting Firebase to Supabase Migration', 'step');
    log('='.repeat(60), 'step');

    try {
        // 1. Fetch and migrate users
        const users = await fetchAllUsers();
        if (users.length === 0) {
            log('No users found in Firebase. Aborting.', 'warning');
            return;
        }
        await insertUsers(users);

        // 2. For each user, migrate their data
        for (const user of users) {
            const userId = user.usr_token;
            log(`\nProcessing user: ${user.usr_name}`, 'step');

            // Exercises
            const exercises = await fetchExercises(userId);
            if (exercises.length > 0) {
                console.log("Exercises found, inserting")
                await insertExercises(exercises);
            }

            // Exercise History (with sets)
            const history = await fetchExerciseHistoryForUser(userId);
            if (history.length > 0) {
                await insertExerciseHistory(history);
                
                for (const record of history) {
                    const sets = await fetchSetsForHistory(record.id);
                    if (sets.length > 0) {
                        // Add exercise_history_id to each set before inserting
                        const setsWithHistoryId = sets.map(set => ({
                            ...set,
                            exercise_history_id: record.id
                        }));
                        await insertSets(setsWithHistoryId);
                    }
                }
            }

            // Workouts (with nested exercises)
            const workouts = await fetchWorkouts(userId);
            if (workouts.length > 0) {
                await insertWorkouts(workouts);

                for (const workout of workouts) {
                    const woes = await fetchWorkoutExercises(workout.id);
                    if (woes.length > 0) {
                        await insertWorkoutExercises(woes, workout.id);
                    }
                }
            }

            // Splits (with nested weeks and days)
            const splits = await fetchSplits(userId);
            if (splits.length > 0) {
                await insertSplits(splits);

                for (const split of splits) {
                    const weeks = await fetchSplitWeeks(split.id);
                    for (const week of weeks) {
                        const days = await fetchDaysForWeek(split.id, week.id);
                        if (days.length > 0) {
                            await insertDays(days, split.id);
                        }
                    }
                }
            }

            await sleep(500);
        }

        // 3. Print summary
        log('\n' + '='.repeat(60), 'step');
        log('Migration Summary', 'step');
        log('='.repeat(60), 'step');
        log(`Users: ${stats.users}`, 'success');
        log(`Exercises: ${stats.exercises}`, 'success');
        log(`Exercise History: ${stats.exerciseHistory}`, 'success');
        log(`Sets: ${stats.sets}`, 'success');
        log(`Workouts: ${stats.workouts}`, 'success');
        log(`Workout Exercises: ${stats.workoutExercises}`, 'success');
        log(`Splits: ${stats.splits}`, 'success');
        log(`Days: ${stats.days}`, 'success');

        if (stats.errors.length > 0) {
            log(`\nErrors: ${stats.errors.length}`, 'warning');
            log('Review logs above for details', 'warning');
        } else {
            log('\n✨ Migration completed successfully!', 'success');
        }

        log('\nNext steps:', 'step');
        log('1. Run: node verify-migration.js', 'info');
        log('2. Check Supabase dashboard', 'info');
        log('3. Test your app with Supabase', 'info');
        log('='.repeat(60), 'step');
    } catch (error) {
        log(`\nMigration failed: ${error.message}`, 'error');
        console.error(error);
        process.exit(1);
    }
}

runMigration().catch((error) => {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
});
