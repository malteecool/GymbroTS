import { supabase } from '../supabaseConfig';

export async function getUserRatingForWorkout(workoutId: string, userId: string): Promise<number | null> {
    try {
        const { data, error } = await supabase
            .from('workout_rating')
            .select('rating')
            .eq('workout_id', workoutId)
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        return data?.rating ?? null;
    } catch (error) {
        console.error('Error getting user rating for workout:', error);
        return null;
    }
}

/**
 * Rate a workout 0-5 (upserts — one rating per user per workout).
 *
 * Writing the rating is the whole operation. The workout's avg_rating and
 * rating_count are recomputed from `workout_rating` by a trigger
 * (migration/counter-triggers.sql), so the aggregate follows from the rows
 * rather than being asserted by the rater. That matters here more than
 * anywhere else: the average lives on the *creator's* workout row, so a client
 * that computes it is a client that can write any score it likes to someone
 * else's workout.
 */
export async function rateWorkout(workoutId: string, userId: string, rating: number): Promise<void> {
    try {
        const { error } = await supabase
            .from('workout_rating')
            .upsert(
                { workout_id: workoutId, user_id: userId, rating, updated_at: new Date().toISOString() },
                { onConflict: 'workout_id,user_id' }
            );

        if (error) throw error;
    } catch (error) {
        console.error('Error rating workout:', error);
        throw error;
    }
}
