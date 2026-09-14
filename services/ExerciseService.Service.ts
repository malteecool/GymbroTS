import { supabase } from '../supabaseConfig';
import { Exercise } from '../interfaces/Exercise.Interface';
import { ExerciseHistory } from '../interfaces/ExerciseHistory.Interface';
import { Set as WorkoutSet } from '../interfaces/Set.Interface';
import { PersonalRecord } from '../interfaces/Achievement.Interface';
import { ExerciseMapper, ExerciseHistoryMapper, SetMapper, WorkoutExerciseMapper } from './mappers';
import { guessMuscleGroup, MuscleGroup } from '../constants/MuscleGroups';

export async function getExercises(usr_id: string): Promise<Exercise[]> {
    try {
        const { data, error } = await supabase
            .from('exercise')
            .select('*')
            .eq('exe_user_id', usr_id)
            .order('exe_date', { ascending: false });

        if (error) throw error;

        return ExerciseMapper.toDomainList(data || []);
    } catch (error) {
        console.error('Error getting exercises:', error);
        throw error;
    }
}

export async function getExerciseById(exe_id: string): Promise<Exercise | null> {
    try {
        console.log(exe_id)
        const { data, error } = await supabase
            .from('exercise')
            .select('*')
            .eq('id', exe_id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw error;
        }

        return ExerciseMapper.toDomain(data);
    } catch (error) {
        console.error('Error getting exercise by id:', error);
        throw error;
    }
}

export async function getDefaultExercises(): Promise<Exercise[]> {
    try {
        const { data, error } = await supabase
            .from('exercise')
            .select('*')
            .is('exe_user_id', null)
            .order('exe_name', { ascending: true });

        if (error) throw error;

        return ExerciseMapper.toDomainList(data || []);
    } catch (error) {
        console.error('Error getting default exercises:', error);
        throw error;
    }
}

export async function getSetByHistoryId(exerciseHistoryId: string): Promise<{ exhSets: WorkoutSet[] }> {
    try {
        const { data, error } = await supabase
            .from('set')
            .select('*')
            .eq('exercise_history_id', exerciseHistoryId)
            .order('set_order', { ascending: true });

        if (error) throw error;

        return { exhSets: SetMapper.toDomainList(data || []) };
    } catch (error) {
        console.error('Error getting set document:', error);
        throw error;
    }
}

/**
 * Fetch just the single most recent logged session for an exercise, optionally
 * skipping any row dated today. Much cheaper than getHistory() when only the
 * latest session is needed (e.g. for an inline "last time" reference).
 */
export async function getLastLoggedSession(exerciseId: string, excludeDateKey?: string): Promise<ExerciseHistory | null> {
    try {
        const { data, error } = await supabase
            .from('exercise_history')
            .select('*')
            .eq('exercise_id', exerciseId)
            .order('exh_date', { ascending: false })
            .limit(5);

        if (error) throw error;
        if (!data || data.length === 0) return null;

        const record = excludeDateKey
            ? data.find((r) => new Date(r.exh_date).toDateString() !== excludeDateKey)
            : data[0];

        if (!record) return null;

        const setsData = await getSetByHistoryId(record.id);
        return ExerciseHistoryMapper.toDomain(record, setsData.exhSets);
    } catch (error) {
        console.error('Error getting last logged session:', error);
        return null;
    }
}

/** How many logged sessions a single history page holds. */
export const HISTORY_PAGE_SIZE = 5;

export interface ExerciseHistoryPage {
    items: ExerciseHistory[];
    /** True when there is at least one older session past this page. */
    hasMore: boolean;
}

/**
 * Fetch the sets of several sessions in one query, grouped by history id, so a
 * page of history costs two round trips instead of one per session.
 */
async function getSetsByHistoryIds(historyIds: string[]): Promise<Map<string, WorkoutSet[]>> {
    const grouped = new Map<string, WorkoutSet[]>();
    if (historyIds.length === 0) return grouped;

    const { data, error } = await supabase
        .from('set')
        .select('*')
        .in('exercise_history_id', historyIds)
        .order('set_order', { ascending: true });

    if (error) throw error;

    for (const row of data || []) {
        const sets = grouped.get(row.exercise_history_id);
        if (sets) {
            sets.push(SetMapper.toDomain(row));
        } else {
            grouped.set(row.exercise_history_id, [SetMapper.toDomain(row)]);
        }
    }

    return grouped;
}

/**
 * Fetch one page of logged sessions for an exercise, newest first. History can
 * run to hundreds of sessions, so callers page through it instead of loading
 * the lot up front.
 */
export async function getHistory(
    exerciseId: string,
    options: { limit?: number; offset?: number } = {}
): Promise<ExerciseHistoryPage> {
    const limit = options.limit ?? HISTORY_PAGE_SIZE;
    const offset = options.offset ?? 0;

    try {
        // Ask for one row past the page so we know whether a "load more" is worth offering.
        const { data, error } = await supabase
            .from('exercise_history')
            .select('*')
            .eq('exercise_id', exerciseId)
            .order('exh_date', { ascending: false })
            .range(offset, offset + limit);

        if (error) throw error;

        const rows = data || [];
        const hasMore = rows.length > limit;
        const pageRows = hasMore ? rows.slice(0, limit) : rows;

        if (pageRows.length === 0) {
            return { items: [], hasMore: false };
        }

        const setsByHistoryId = await getSetsByHistoryIds(pageRows.map((row) => row.id));

        return {
            items: pageRows.map((row) =>
                ExerciseHistoryMapper.toDomain(row, setsByHistoryId.get(row.id) || [])
            ),
            hasMore,
        };
    } catch (error) {
        console.error('Error getting history:', error);
        throw error;
    }
}

export async function getHistoryByUser(userId: string): Promise<ExerciseHistory[]> {
    try {
        const { data, error } = await supabase
            .from('exercise_history')
            .select(`
                *,
                exercise(exe_user_id)
            `)
            .eq('exercise.exe_user_id', userId)
            .order('exh_date', { ascending: false });

        if (error) throw error;

        const documentData: ExerciseHistory[] = [];

        for (const historyRecord of data || []) {
            const setsData = await getSetByHistoryId(historyRecord.id);
            documentData.push(
                ExerciseHistoryMapper.toDomain(historyRecord, setsData.exhSets)
            );
        }

        return documentData;
    } catch (error) {
        console.error('Error getting history by user:', error);
        throw error;
    }
}

export async function removeExercise(exe_id: string, usr_id: string): Promise<void> {
    try {
        // Delete the exercise
        const { error } = await supabase
            .from('exercise')
            .delete()
            .eq('id', exe_id);

        if (error) throw error;

        // Remove from workouts
        await removeWorkoutExercise(null, exe_id, usr_id);
    } catch (error) {
        console.error('Error removing exercise:', error);
        throw error;
    }
}

export async function updateExerciseDate(exe_id: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('exercise')
            .update({ exe_date: ExerciseHistoryMapper.dateToSupabase(new Date()) })
            .eq('id', exe_id);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating exercise date:', error);
        throw error;
    }
}

/**
 * Create an exercise. When no muscle group is given the name is used to guess
 * one, so a quick add still lands in a category the filter can find; anything
 * unrecognised stays uncategorised until the user picks a group.
 */
export async function addExercise(
    name: string,
    usr_id: string,
    muscleGroup?: MuscleGroup | null
): Promise<string> {
    try {
        const { data, error } = await supabase
            .from('exercise')
            .insert(ExerciseMapper.toSupabase({
                exeName: name,
                exeUserId: usr_id,
                exeMuscleGroup: muscleGroup !== undefined ? muscleGroup : guessMuscleGroup(name)
            }))
            .select()
            .single();

        if (error) throw error;

        return data.id;
    } catch (error) {
        console.error('Error adding exercise:', error);
        throw error;
    }
}

/** Set (or clear, with null) the primary muscle group of an existing exercise. */
export async function setExerciseMuscleGroup(
    exe_id: string,
    muscleGroup: MuscleGroup | null
): Promise<void> {
    try {
        const { error } = await supabase
            .from('exercise')
            .update({ exe_muscle_group: muscleGroup })
            .eq('id', exe_id);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating exercise muscle group:', error);
        throw error;
    }
}

export interface AddExerciseHistoryResult {
    success: boolean;
    /** Records beaten by this session, in the order weight then reps. */
    personalRecords: PersonalRecord[];
}

export async function addExerciseHistory(
    exercise: Exercise,
    sets: WorkoutSet[],
    comment: string
): Promise<AddExerciseHistoryResult> {
    let personalRecords: PersonalRecord[] = [];

    try {
        // Create exercise history record
        const { data: historyData, error: historyError } = await supabase
            .from('exercise_history')
            .insert(ExerciseHistoryMapper.toSupabase(
                { id: exercise.id, exhSets: sets, exhDate: exercise.exeDate, exhComment: comment } as any,
                exercise.id
            ))
            .select()
            .single();

        if (historyError) throw historyError;

        if (sets.length > 0) {
            // Insert sets
            const setRecords = SetMapper.toSupabaseList(sets, historyData.id);

            const { error: setError } = await supabase
                .from('set')
                .insert(setRecords);

            if (setError) throw setError;

            // Update exercise date
            await updateExerciseDate(exercise.id);

            // Bump the stored maxima, and report anything this session beat
            personalRecords = await updatePersonalRecords(exercise, sets);
        }

        return { success: true, personalRecords };
    } catch (error) {
        console.error('Error adding exercise history:', error);
        return { success: false, personalRecords: [] };
    }
}

/**
 * Compares a logged session against the exercise's stored maxima, writes back
 * any that were beaten, and returns them as personal records.
 *
 * The write is the source of truth for "is this a PR": once the maximum has
 * been raised, the same session logged again cannot beat it, so callers do not
 * need to guard against announcing the same record twice.
 */
export async function updatePersonalRecords(
    exercise: Exercise,
    sets: WorkoutSet[]
): Promise<PersonalRecord[]> {
    if (sets.length === 0) return [];

    try {
        const { data, error: fetchError } = await supabase
            .from('exercise')
            .select('exe_max_weight, exe_max_reps')
            .eq('id', exercise.id)
            .single();

        if (fetchError) throw fetchError;

        const previousWeight = data?.exe_max_weight ?? 0;
        const previousReps = data?.exe_max_reps ?? 0;
        const sessionWeight = Math.max(...sets.map(s => s.setWeight));
        const sessionReps = Math.max(...sets.map(s => s.setReps));

        const records: PersonalRecord[] = [];
        const update: Partial<Exercise> = {};

        if (sessionWeight > previousWeight) {
            update.exeMaxWeight = sessionWeight;
            records.push({
                exerciseId: exercise.id,
                exerciseName: exercise.exeName,
                kind: 'weight',
                value: sessionWeight,
                previousValue: previousWeight,
            });
        }

        if (sessionReps > previousReps) {
            update.exeMaxReps = sessionReps;
            records.push({
                exerciseId: exercise.id,
                exerciseName: exercise.exeName,
                kind: 'reps',
                value: sessionReps,
                previousValue: previousReps,
            });
        }

        if (records.length > 0) {
            const { error: updateError } = await supabase
                .from('exercise')
                .update(ExerciseMapper.toSupabaseUpdate(update))
                .eq('id', exercise.id);

            if (updateError) throw updateError;
        }

        return records;
    } catch (error) {
        console.error('Error updating personal records:', error);
        return [];
    }
}

/**
 * Given a list of exercise IDs, returns the subset that have a logged
 * exercise_history entry (i.e. at least one set) on the given date.
 * Date-based, not session-based: logging the same exercise elsewhere on the
 * same day would also count.
 */
export async function getCompletedExerciseIdsForDate(exerciseIds: string[], date: Date): Promise<string[]> {
    if (exerciseIds.length === 0) return [];

    try {
        const { data, error } = await supabase
            .from('exercise_history')
            .select('exercise_id, exh_date')
            .in('exercise_id', exerciseIds);

        if (error) throw error;

        const targetDateKey = date.toISOString().split('T')[0];
        const completed = new Set<string>();
        for (const row of data || []) {
            const rowDateKey = new Date(row.exh_date).toISOString().split('T')[0];
            if (rowDateKey === targetDateKey) {
                completed.add(row.exercise_id);
            }
        }

        return Array.from(completed);
    } catch (error) {
        console.error('Error getting completed exercise ids:', error);
        return [];
    }
}

export async function updateExerciseMaxWeight(exe_id: string, weight: number): Promise<void> {
    try {
        const { data, error: fetchError } = await supabase
            .from('exercise')
            .select('exe_max_weight')
            .eq('id', exe_id)
            .single();

        if (fetchError) throw fetchError;

        if (weight > (data?.exe_max_weight || 0)) {
            const { error: updateError } = await supabase
                .from('exercise')
                .update(ExerciseMapper.toSupabaseUpdate({ exeMaxWeight: weight }))
                .eq('id', exe_id);

            if (updateError) throw updateError;
        }
    } catch (error) {
        console.error('Error updating exercise max weight:', error);
        throw error;
    }
}

export async function removeWorkoutExercise(
    workout_id: string | null, 
    exe_id: string, 
    usr_id: string | null
): Promise<void> {
    try {
        if (usr_id !== null) {
            // Get all workouts for the user
            const { data: workouts, error: workoutError } = await supabase
                .from('workout')
                .select('id')
                .eq('wor_user_id', usr_id);

            if (workoutError) throw workoutError;

            // Delete exercise from all workouts for this user
            for (const workout of workouts || []) {
                const { error: deleteError } = await supabase
                    .from('workout_exercise')
                    .delete()
                    .eq('workout_id', workout.id)
                    .eq('exercise_id', exe_id);

                if (deleteError) throw deleteError;
            }
        } else if (workout_id !== null) {
            // Delete exercise from specific workout
            const { error } = await supabase
                .from('workout_exercise')
                .delete()
                .eq('workout_id', workout_id)
                .eq('exercise_id', exe_id);

            if (error) throw error;
        }
    } catch (error) {
        console.error('Error removing workout exercise:', error);
        throw error;
    }
}