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
 * Rate a workout 0-5 (upserts — one rating per user per workout), then
 * recomputes and persists the workout's avg_rating/rating_count.
 */
export async function rateWorkout(workoutId: string, userId: string, rating: number): Promise<void> {
    try {
        const { error: upsertError } = await supabase
            .from('workout_rating')
            .upsert(
                { workout_id: workoutId, user_id: userId, rating, updated_at: new Date().toISOString() },
                { onConflict: 'workout_id,user_id' }
            );

        if (upsertError) throw upsertError;

        const { data: ratings, error: fetchError } = await supabase
            .from('workout_rating')
            .select('rating')
            .eq('workout_id', workoutId);

        if (fetchError) throw fetchError;

        const ratingCount = ratings?.length ?? 0;
        const avgRating = ratingCount > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount
            : null;

        const { error: updateError } = await supabase
            .from('workout')
            .update({ avg_rating: avgRating, rating_count: ratingCount })
            .eq('id', workoutId);

        if (updateError) throw updateError;
    } catch (error) {
        console.error('Error rating workout:', error);
        throw error;
    }
}
