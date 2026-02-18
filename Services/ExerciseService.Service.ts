import { supabase } from '../supabaseConfig';
import { Exercise } from '../interfaces/Exercise.Interface';
import { ExerciseHistory } from '../interfaces/ExerciseHistory.Interface';
import { Set } from '../interfaces/Set.Interface';
import { ExerciseMapper, ExerciseHistoryMapper, SetMapper, WorkoutExerciseMapper } from './mappers';

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

export async function getSetDocument(exerciseHistoryId: string): Promise<{ exh_sets: Set[] }> {
    try {
        const { data, error } = await supabase
            .from('set')
            .select('*')
            .eq('exercise_history_id', exerciseHistoryId)
            .order('set_order', { ascending: true });

        if (error) throw error;

        return { exh_sets: SetMapper.toDomainList(data || []) };
    } catch (error) {
        console.error('Error getting set document:', error);
        throw error;
    }
}

export async function getHistory(exerciseId: string, date?: Date): Promise<ExerciseHistory[]> {
    try {
        const { data, error } = await supabase
            .from('exercise_history')
            .select('*')
            .eq('exercise_id', exerciseId)
            .order('exh_date', { ascending: false });

        if (error) throw error;

        const documentData: ExerciseHistory[] = [];

        for (const historyRecord of data || []) {
            const historyDate = new Date(historyRecord.exh_date);

            if (!date || (date && historyDate > date)) {
                const setsData = await getSetDocument(historyRecord.id);
                documentData.push(
                    ExerciseHistoryMapper.toDomain(historyRecord, setsData.exh_sets)
                );
            }
        }

        return documentData;
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
            const setsData = await getSetDocument(historyRecord.id);
            documentData.push(
                ExerciseHistoryMapper.toDomain(historyRecord, setsData.exh_sets)
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

export async function addExercise(name: string, usr_id: string): Promise<string> {
    try {
        const { data, error } = await supabase
            .from('exercise')
            .insert(ExerciseMapper.toSupabase({
                exe_name: name,
                exe_user_id: usr_id
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

export async function addExerciseHistory(
    exercise: Exercise, 
    sets: Set[], 
    comment: string
): Promise<boolean> {
    try {
        // Create exercise history record
        const { data: historyData, error: historyError } = await supabase
            .from('exercise_history')
            .insert(ExerciseHistoryMapper.toSupabase(
                { id: exercise.id, exh_sets: sets, exh_date: exercise.exe_date, exh_comment: comment } as any,
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

            // Update max weight
            const maxWeight = Math.max(...sets.map(o => o.set_weight));
            await updateExerciseMaxWeight(exercise.id, maxWeight);
        }

        return true;
    } catch (error) {
        console.error('Error adding exercise history:', error);
        return false;
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
                .update(ExerciseMapper.toSupabaseUpdate({ exe_max_weight: weight }))
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