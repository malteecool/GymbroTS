import { supabase } from '../supabaseConfig';
import { Workout } from '../interfaces/Workout.Interface';
import { Exercise } from '../interfaces/Exercise.Interface';
import { ExerciseMapper } from './mappers';
import { addExercise, removeWorkoutExercise } from './ExerciseService.Service';

export interface WorkoutExercise {
    woe_exercise: string;
    woe_ordinal: number;
    woe_id?: string;
}

export async function getWorkouts(usr_id: string): Promise<Workout[]> {
    try {
        const { data, error } = await supabase
            .from('workout')
            .select('*')
            .eq('wor_user_id', usr_id)
            .order('wor_last_done', { ascending: false });

        if (error) throw error;

        return (data || []).map(workout => ({
            id: workout.id,
            worCompletedCount: workout.wor_completed_count,
            worEstimateTime: workout.wor_estimate_time,
            worLastDone: workout.wor_last_done,
            worName: workout.wor_name,
            worUserId: workout.wor_user_id,
            isPublic: workout.is_public ?? false,
            sourceWorkoutId: workout.source_workout_id ?? null,
            linkType: workout.link_type ?? null,
            copyCount: workout.copy_count ?? 0,
        }));
    } catch (error) {
        console.error('Error getting workouts:', error);
        throw error;
    }
}

export async function getWorkoutById(wor_id: string): Promise<Workout | null> {
    try {
        const { data, error } = await supabase
            .from('workout')
            .select('*')
            .eq('id', wor_id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw error;
        }

        if (!data) return null;

        return {
            id: data.id,
            worCompletedCount: data.wor_completed_count,
            worEstimateTime: data.wor_estimate_time,
            worLastDone: data.wor_last_done,
            worName: data.wor_name,
            worUserId: data.wor_user_id,
            isPublic: data.is_public ?? false,
            sourceWorkoutId: data.source_workout_id ?? null,
            linkType: data.link_type ?? null,
            copyCount: data.copy_count ?? 0,
        };
    } catch (error) {
        console.error('Error getting workout by id:', error);
        throw error;
    }
}

export const getExerciseDocument = async (docId: string): Promise<Exercise[]> => {
    try {
        const { data, error } = await supabase
            .from('workout_exercise')
            .select('exercise_id')
            .eq('workout_id', docId)
            .order('ordinal', { ascending: true });

        if (error) throw error;

        const exercises: Exercise[] = [];
        for (const row of data || []) {
            const { data: exerciseData, error: exerciseError } = await supabase
                .from('exercise')
                .select('*')
                .eq('id', row.exercise_id)
                .single();

            if (!exerciseError && exerciseData) {
                exercises.push(ExerciseMapper.toDomain(exerciseData));
            }
        }
        return exercises;
    } catch (error) {
        console.error('Error getting exercise document:', error);
        throw error;
    }
};

export async function updateWorkout(workout: Workout, timer: number): Promise<void> {
    try {
        const { error } = await supabase
            .from('workout')
            .update({
                wor_completed_count: workout.worCompletedCount + 1,
                wor_estimate_time: timer,
                wor_last_done: new Date().toISOString()
            })
            .eq('id', workout.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating workout:', error);
        throw error;
    }
}

export async function getWorkoutExercises(workoutId: string): Promise<(Exercise & { woeId: string; ordinal: number })[]> {
    try {
        const { data, error } = await supabase
            .from('workout_exercise')
            .select(`
                woe_id,
                ordinal,
                exercise(*)
            `)
            .eq('workout_id', workoutId)
            .order('ordinal', { ascending: true });

        if (error) throw error;

        const documentData: (Exercise & { woeId: string; ordinal: number })[] = [];
        for (const row of data || []) {
            if (row.exercise) {
                documentData.push({
                    woeId: row.woe_id,
                    ordinal: row.ordinal,
                    ...ExerciseMapper.toDomain(row.exercise)
                });
            }
        }
        return documentData;
    } catch (error) {
        console.error('Error getting workout exercises:', error);
        throw error;
    }
}

export async function updateWorkoutExerciseOrdinal(wor_id: string, woe_id: string, ordinal: number): Promise<void> {
    try {
        const { error } = await supabase
            .from('workout_exercise')
            .update({ ordinal: ordinal })
            .eq('woe_id', woe_id);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating workout exercise ordinal:', error);
        throw error;
    }
}

export async function getDefaultWorkouts(): Promise<Workout[]> {
    try {
        const { data, error } = await supabase
            .from('workout')
            .select('*')
            .is('wor_user_id', null);

        if (error) throw error;

        return (data || []).map(workout => ({
            id: workout.id,
            worCompletedCount: workout.wor_completed_count,
            worEstimateTime: workout.wor_estimate_time,
            worLastDone: workout.wor_last_done,
            worName: workout.wor_name,
            worUserId: workout.wor_user_id,
            isPublic: workout.is_public ?? false,
            sourceWorkoutId: workout.source_workout_id ?? null,
            linkType: workout.link_type ?? null,
            copyCount: workout.copy_count ?? 0,
        }));
    } catch (error) {
        console.error('Error getting default workouts:', error);
        throw error;
    }
}

export const getFormattedTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor((time % 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export async function addWorkoutWithExercises(
    workoutName: string, 
    selectedExercises: { id: string; ordinal: number }[], 
    usr_id: string
): Promise<void> {
    try {
        const workoutId = await addWorkout(workoutName, usr_id);
        if (!workoutId) {
            throw new Error('Failed to create workout');
        }
        
        for (const exercise of selectedExercises) {
            await supabase
                .from('workout_exercise')
                .insert({
                    workout_id: workoutId,
                    exercise_id: exercise.id,
                    ordinal: exercise.ordinal
                });
        }
    } catch (error) {
        console.error(`Error adding workout with exercises: ${error}`);
        throw error;
    }
}

export const attachToWorkout = async (exerciseId: string, workoutId: string, ordinal: number): Promise<void> => {
    try {
        const { error } = await supabase
            .from('workout_exercise')
            .insert({
                workout_id: workoutId,
                exercise_id: exerciseId,
                ordinal: ordinal
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error attaching exercise to workout:', error);
        throw error;
    }
};

export async function addWorkout(name: string, usr_id: string): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('workout')
            .insert({
                wor_completed_count: 0,
                wor_estimate_time: 0,
                wor_last_done: new Date().toISOString(),
                wor_name: name,
                wor_user_id: usr_id
            })
            .select()
            .single();

        if (error) throw error;
        return data?.id || null;
    } catch (error) {
        console.error('Error adding workout:', error);
        return null;
    }
}

export async function removeWorkout(workoutId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('workout')
            .delete()
            .eq('id', workoutId);

        if (error) throw error;
    } catch (error) {
        console.error('Error removing workout:', error);
        throw error;
    }
}

export async function toggleWorkoutVisibility(workoutId: string, isPublic: boolean): Promise<void> {
    try {
        const { error } = await supabase
            .from('workout')
            .update({ is_public: isPublic })
            .eq('id', workoutId);

        if (error) throw error;
    } catch (error) {
        console.error('Error toggling workout visibility:', error);
        throw error;
    }
}

export async function getPublicWorkouts(userId: string): Promise<Workout[]> {
    try {
        const { data, error } = await supabase
            .from('workout')
            .select('*')
            .eq('wor_user_id', userId)
            .eq('is_public', true)
            .order('wor_last_done', { ascending: false });

        if (error) throw error;

        return (data || []).map(workout => ({
            id: workout.id,
            worCompletedCount: workout.wor_completed_count,
            worEstimateTime: workout.wor_estimate_time,
            worLastDone: workout.wor_last_done,
            worName: workout.wor_name,
            worUserId: workout.wor_user_id,
            isPublic: workout.is_public ?? false,
            sourceWorkoutId: workout.source_workout_id ?? null,
            linkType: workout.link_type ?? null,
            copyCount: workout.copy_count ?? 0,
        }));
    } catch (error) {
        console.error('Error getting public workouts:', error);
        throw error;
    }
}

async function cloneWorkoutForUser(
    sourceWorkoutId: string,
    targetUserId: string,
    linkType: 'copy' | 'follow'
): Promise<string> {
    const source = await getWorkoutById(sourceWorkoutId);
    if (!source) throw new Error('Source workout not found');

    const sourceExercises = await getWorkoutExercises(sourceWorkoutId);

    const { data: newWorkout, error: insertError } = await supabase
        .from('workout')
        .insert({
            wor_name: source.worName,
            wor_user_id: targetUserId,
            wor_completed_count: 0,
            wor_estimate_time: source.worEstimateTime,
            wor_last_done: null,
            source_workout_id: sourceWorkoutId,
            link_type: linkType,
        })
        .select()
        .single();

    if (insertError) throw insertError;

    for (const sourceExercise of sourceExercises) {
        const newExerciseId = await addExercise(sourceExercise.exeName, targetUserId);
        await attachToWorkout(newExerciseId, newWorkout.id, sourceExercise.ordinal);
    }

    return newWorkout.id;
}

export async function copyWorkout(sourceWorkoutId: string, targetUserId: string): Promise<string> {
    try {
        const newWorkoutId = await cloneWorkoutForUser(sourceWorkoutId, targetUserId, 'copy');

        const { data: source } = await supabase
            .from('workout')
            .select('copy_count')
            .eq('id', sourceWorkoutId)
            .single();

        await supabase
            .from('workout')
            .update({ copy_count: (source?.copy_count ?? 0) + 1 })
            .eq('id', sourceWorkoutId);

        return newWorkoutId;
    } catch (error) {
        console.error('Error copying workout:', error);
        throw error;
    }
}

export async function linkWorkout(sourceWorkoutId: string, targetUserId: string): Promise<string> {
    try {
        return await cloneWorkoutForUser(sourceWorkoutId, targetUserId, 'follow');
    } catch (error) {
        console.error('Error linking workout:', error);
        throw error;
    }
}

export async function syncLinkedWorkout(workoutId: string): Promise<void> {
    try {
        const workout = await getWorkoutById(workoutId);
        if (!workout || workout.linkType !== 'follow' || !workout.sourceWorkoutId) return;

        const [sourceExercises, localExercises] = await Promise.all([
            getWorkoutExercises(workout.sourceWorkoutId),
            getWorkoutExercises(workoutId),
        ]);

        const sourceNames = new Set(sourceExercises.map(e => e.exeName.trim().toLowerCase()));
        const localNames = new Set(localExercises.map(e => e.exeName.trim().toLowerCase()));

        let nextOrdinal = localExercises.length;
        for (const sourceExercise of sourceExercises) {
            if (!localNames.has(sourceExercise.exeName.trim().toLowerCase())) {
                const newExerciseId = await addExercise(sourceExercise.exeName, workout.worUserId);
                await attachToWorkout(newExerciseId, workoutId, nextOrdinal);
                nextOrdinal++;
            }
        }

        for (const localExercise of localExercises) {
            if (!sourceNames.has(localExercise.exeName.trim().toLowerCase())) {
                await removeWorkoutExercise(workoutId, localExercise.id, null);
            }
        }
    } catch (error) {
        console.error('Error syncing linked workout:', error);
        throw error;
    }
}

export async function unlinkWorkout(workoutId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('workout')
            .update({ source_workout_id: null, link_type: null })
            .eq('id', workoutId);

        if (error) throw error;
    } catch (error) {
        console.error('Error unlinking workout:', error);
        throw error;
    }
}
