import { getHistoryByUser } from './ExerciseService.Service';
import { User } from '../interfaces/User.Interface';
import { supabase } from '../supabaseConfig';

export interface WorkoutCounts {
    lifetime: string[];
    weekly: string[];
}

export function startOfWeek(date: Date): Date {
    const d = new Date(date);
    const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function onlyUnique(value: string, index: number, array: string[]): boolean {
    return array.indexOf(value) === index;
}

function roundToDate(date: Date): Date {
    // TODO: This does not take into account timezones but is needed to display the current week correctly
    const d = new Date(date);
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
}

export async function getWorkoutsCount(user: User): Promise<WorkoutCounts> {
    try {
        const startOfWeekDate = roundToDate(startOfWeek(new Date()));
        
        // Fetch all distinct dates in lifetime
        const { data: lifetimeData, error: lifetimeError } = await supabase
            .from('exercise_history')
            .select('exh_date', { count: 'exact' })
            .in('exercise_id', await getExerciseIdsByUser(user.id));
        
        if (lifetimeError) throw lifetimeError;
        
        const lifetimeDates = lifetimeData
            ? [...new Set(lifetimeData.map(row => new Date(row.exh_date).toISOString().split('T')[0]))]
            : [];
        
        // Fetch distinct dates within the current week
        const { data: weeklyData, error: weeklyError } = await supabase
            .from('exercise_history')
            .select('exh_date')
            .in('exercise_id', await getExerciseIdsByUser(user.id))
            .gte('exh_date', startOfWeekDate.toISOString());
        
        if (weeklyError) throw weeklyError;
        
        const weeklyDates = weeklyData
            ? [...new Set(weeklyData.map(row => new Date(row.exh_date).toISOString().split('T')[0]))]
            : [];
        
        return { lifetime: lifetimeDates, weekly: weeklyDates };
    } catch (error) {
        console.error('Error getting workouts count:', error);
        throw error;
    }
}

/**
 * Get all exercise IDs for a user (helper for workout count queries)
 */
async function getExerciseIdsByUser(userId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('exercise')
            .select('id')
            .eq('exe_user_id', userId);
        
        if (error) throw error;
        return data?.map(e => e.id) || [];
    } catch (error) {
        console.error('Error getting exercise IDs:', error);
        return [];
    }
}

export function getWeekNumber(date: Date): number {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
    const week1 = new Date(target.getFullYear(), 0, 4);
    return (
        1 +
        Math.round(((target.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    );
}
