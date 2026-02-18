import { supabase } from '../supabaseConfig';
import { Workout } from '../interfaces/Workout.Interface';
import { Exercise } from '../interfaces/Exercise.Interface';
import { ExerciseMapper } from './mappers';

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
            wor_completed_count: workout.wor_completed_count,
            wor_estimate_time: workout.wor_estimate_time,
            wor_last_done: workout.wor_last_done,
            wor_name: workout.wor_name,
            wor_user_id: workout.wor_user_id
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
            wor_completed_count: data.wor_completed_count,
            wor_estimate_time: data.wor_estimate_time,
            wor_last_done: data.wor_last_done,
            wor_name: data.wor_name,
            wor_user_id: data.wor_user_id
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
                wor_completed_count: workout.wor_completed_count + 1,
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

export async function getWorkoutExercises(workoutId: string): Promise<(Exercise & { woe_id: string; ordinal: number })[]> {
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

        const documentData: (Exercise & { woe_id: string; ordinal: number })[] = [];
        for (const row of data || []) {
            if (row.exercise) {
                documentData.push({
                    woe_id: row.woe_id,
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
            wor_completed_count: workout.wor_completed_count,
            wor_estimate_time: workout.wor_estimate_time,
            wor_last_done: workout.wor_last_done,
            wor_name: workout.wor_name,
            wor_user_id: workout.wor_user_id
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
