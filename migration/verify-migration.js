#!/usr/bin/env node

/**
 * Migration Verification Script
 * 
 * Compares record counts between Firebase and Supabase to verify migration success.
 * Usage: node verify-migration.js
 */

require('dotenv').config({ path: '.env.migration' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// INITIALIZE FIREBASE & SUPABASE
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

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// HELPERS
// ============================================================================

const log = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const icons = { info: 'ℹ️ ', success: '✅ ', warning: '⚠️ ', error: '❌ ', step: '📍 ' };
    console.log(`${icons[type] || ''}[${timestamp}] ${message}`);
};

// ============================================================================
// FIREBASE COUNTERS
// ============================================================================

async function countFirebaseCollection(collectionName) {
    try {
        const ref = collection(firebaseDb, collectionName);
        const snapshot = await getDocs(ref);
        return snapshot.size;
    } catch (error) {
        log(`Error counting Firebase collection ${collectionName}: ${error.message}`, 'warning');
        return 0;
    }
}

async function countFirebaseSubcollection(parentCollection, parentId, subcollection) {
    try {
        const ref = collection(firebaseDb, parentCollection, parentId, subcollection);
        const snapshot = await getDocs(ref);
        return snapshot.size;
    } catch (error) {
        // Parent might not exist with this ID
        return 0;
    }
}

async function countAllSets() {
    try {
        const historyRef = collection(firebaseDb, 'Exercise_history');
        const allHistoryDocs = await getDocs(historyRef);
        let totalSets = 0;

        for (const historyDoc of allHistoryDocs.docs) {
            const setsCount = await countFirebaseSubcollection('Exercise_history', historyDoc.id, 'sets');
            totalSets += setsCount;
        }

        return totalSets;
    } catch (error) {
        log(`Error counting sets: ${error.message}`, 'warning');
        return 0;
    }
}

async function countAllWorkoutExercises() {
    try {
        const workoutRef = collection(firebaseDb, 'Workout');
        const allWorkoutDocs = await getDocs(workoutRef);
        let totalWOE = 0;

        for (const workoutDoc of allWorkoutDocs.docs) {
            const woeCount = await countFirebaseSubcollection('Workout', workoutDoc.id, 'workout_exercise');
            totalWOE += woeCount;
        }

        return totalWOE;
    } catch (error) {
        log(`Error counting workout exercises: ${error.message}`, 'warning');
        return 0;
    }
}

async function countAllDays() {
    try {
        const splitRef = collection(firebaseDb, 'Split');
        const allSplitDocs = await getDocs(splitRef);
        let totalDays = 0;

        for (const splitDoc of allSplitDocs.docs) {
            const weekRef = collection(firebaseDb, 'Split', splitDoc.id, 'Split_week');
            const weekDocs = await getDocs(weekRef);

            for (const weekDoc of weekDocs.docs) {
                const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                for (const dayName of WEEK_DAYS) {
                    const dayCount = await countFirebaseSubcollection(
                        'Split',
                        `${splitDoc.id}/Split_week/${weekDoc.id}`,
                        dayName
                    );
                    // If this doesn't work, try alternative method
                    if (dayCount === 0) {
                        try {
                            const dayRef = collection(firebaseDb, 'Split', splitDoc.id, 'Split_week', weekDoc.id, dayName);
                            const dayDocs = await getDocs(dayRef);
                            totalDays += dayDocs.size;
                        } catch (e) {
                            // Day subcollection might not exist
                        }
                    } else {
                        totalDays += dayCount;
                    }
                }
            }
        }

        return totalDays;
    } catch (error) {
        log(`Error counting days: ${error.message}`, 'warning');
        return 0;
    }
}

// ============================================================================
// SUPABASE COUNTERS
// ============================================================================

async function countSupabaseTable(tableName) {
    try {
        const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    } catch (error) {
        log(`Error counting Supabase table ${tableName}: ${error.message}`, 'warning');
        return 0;
    }
}

// ============================================================================
// MAIN VERIFICATION
// ============================================================================

async function verifyMigration() {
    log('='.repeat(60), 'step');
    log('Verifying Firebase to Supabase Migration', 'step');
    log('='.repeat(60), 'step');

    // Fetch all counts
    log('Counting records in Firebase...', 'info');
    const fbUsers = await countFirebaseCollection('User');
    const fbExercises = await countFirebaseCollection('Exercise');
    const fbExerciseHistory = await countFirebaseCollection('Exercise_history');
    const fbSets = await countAllSets();
    const fbWorkouts = await countFirebaseCollection('Workout');
    const fbWorkoutExercises = await countAllWorkoutExercises();
    const fbSplits = await countFirebaseCollection('Split');
    const fbDays = await countAllDays();

    log('Counting records in Supabase...', 'info');
    const sbUsers = await countSupabaseTable('app_user');
    const sbExercises = await countSupabaseTable('exercise');
    const sbExerciseHistory = await countSupabaseTable('exercise_history');
    const sbSets = await countSupabaseTable('set');
    const sbWorkouts = await countSupabaseTable('workout');
    const sbWorkoutExercises = await countSupabaseTable('workout_exercise');
    const sbSplits = await countSupabaseTable('split');
    const sbDays = await countSupabaseTable('day');

    // Compare and display results
    const comparisons = [
        { label: 'Users', fb: fbUsers, sb: sbUsers },
        { label: 'Exercises', fb: fbExercises, sb: sbExercises },
        { label: 'Exercise History', fb: fbExerciseHistory, sb: sbExerciseHistory },
        { label: 'Sets', fb: fbSets, sb: sbSets },
        { label: 'Workouts', fb: fbWorkouts, sb: sbWorkouts },
        { label: 'Workout Exercises', fb: fbWorkoutExercises, sb: sbWorkoutExercises },
        { label: 'Splits', fb: fbSplits, sb: sbSplits },
        { label: 'Days', fb: fbDays, sb: sbDays },
    ];

    let allMatch = true;

    log('\n' + '='.repeat(60), 'step');
    log('Comparison Results', 'step');
    log('='.repeat(60), 'step');

    for (const comp of comparisons) {
        const match = comp.fb === comp.sb;
        if (!match) allMatch = false;

        const status = match ? '✅' : '❌';
        const padding = ' '.repeat(Math.max(0, 25 - comp.label.length));
        log(`${status} ${comp.label}${padding} Firebase: ${comp.fb.toString().padStart(4)} | Supabase: ${comp.sb.toString().padStart(4)}`, match ? 'success' : 'error');
    }

    log('\n' + '='.repeat(60), 'step');

    if (allMatch) {
        log('✨ All record counts match! Migration successful!', 'success');
        log('Your data has been successfully migrated.', 'success');
    } else {
        log('⚠️ Some counts don\'t match. Please review:', 'warning');
        log('- Check migration logs for errors', 'info');
        log('- Verify Firebase and Supabase are connected correctly', 'info');
        log('- Some records may have failed to migrate', 'info');
    }

    log('='.repeat(60), 'step');

    return allMatch;
}

verifyMigration()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        log(`Verification failed: ${error.message}`, 'error');
        console.error(error);
        process.exit(1);
    });
