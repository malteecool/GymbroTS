import { supabase } from '../supabaseConfig';
import { getWeekNumber } from './StatsService.Service';
import { getWorkoutById } from './WorkoutService.Service';
import { Workout } from '../interfaces/Workout.Interface';

export interface SplitDay {
    workout: Workout | null;
    completed: boolean;
    day: string;
    weekId?: string;
}

export interface SplitWeek {
    Monday: SplitDay;
    Tuesday: SplitDay;
    Wednesday: SplitDay;
    Thursday: SplitDay;
    Friday: SplitDay;
    Saturday: SplitDay;
    Sunday: SplitDay;
}

export interface SplitData {
    weeks: SplitWeek[];
    spl_ref_week: number;
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]; // Monday=1 to Sunday=0 (ISO standard)

let splitId: string | null = null;

async function getSplitIdByUser(usr_id: string): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('split')
            .select('id')
            .eq('user_id', usr_id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        return data?.id || null;
    } catch (error) {
        console.error('Error getting split by user:', error);
        return null;
    }
}

export async function getReferenceWeek(usr_id: string): Promise<SplitData | null> {
    try {
        // Get the split template
        const { data: splitData, error: splitError } = await supabase
            .from('split')
            .select('id, spl_ref_week')
            .eq('user_id', usr_id)
            .single();

        if (splitError) {
            if (splitError.code === 'PGRST116') return null; // Not found
            throw splitError;
        }

        if (!splitData) return null;

        splitId = splitData.id;
        const refWeek = splitData.spl_ref_week;

        // Get all days for this split template
        const { data: daysData, error: daysError } = await supabase
            .from('split_day')
            .select('day_of_week, workout_id, id')
            .eq('split_id', splitData.id)
            .order('day_of_week', { ascending: true });

        if (daysError) throw daysError;

        if (!daysData || daysData.length === 0) {
            return null;
        }

        // Get the current and upcoming week numbers
        const currentWeekNumber = getWeekNumber(new Date());
        const numberOfFutureWeeks = 5; // Default to 5 weeks

        // Create week instances with completion data
        const weeks: SplitWeek[] = [];

        for (let i = 0; i < numberOfFutureWeeks; i++) {
            const weekNumber = currentWeekNumber + i;
            
            // Get or create week instance (lazy instantiation)
            const weekId = await getOrCreateSplitWeek(splitData.id, weekNumber);

            // Get completion data for the week
            const { data: weekInstance, error: weekError } = await supabase
                .from('split_week')
                .select('completed_days')
                .eq('id', weekId)
                .single();

            if (weekError) {
                console.error('Error fetching week instance:', weekError);
                continue;
            }

            const completedDays = weekInstance?.completed_days || [];

            // Build the week structure
            const weekMap: Partial<SplitWeek> = {};

            for (let dayIndex = 0; dayIndex < daysData.length; dayIndex++) {
                const dayData = daysData[dayIndex];
                const dayName = WEEK_DAYS[dayIndex];

                let workout: Workout | null = null;
                if (dayData.workout_id) {
                    try {
                        workout = await getWorkoutById(dayData.workout_id);
                    } catch (error) {
                        console.error('Error fetching workout:', error);
                    }
                }

                weekMap[dayName] = {
                    workout,
                    completed: completedDays.includes(dayIndex),
                    day: dayName,
                    weekId: weekId
                };
            }

            const weekMapOrdered: SplitWeek = {
                Monday: weekMap.Monday!,
                Tuesday: weekMap.Tuesday!,
                Wednesday: weekMap.Wednesday!,
                Thursday: weekMap.Thursday!,
                Friday: weekMap.Friday!,
                Saturday: weekMap.Saturday!,
                Sunday: weekMap.Sunday!
            };

            weeks.push(weekMapOrdered);
        }

        return {
            weeks,
            spl_ref_week: refWeek
        };
    } catch (error) {
        console.error('Error getting reference week:', error);
        return null;
    }
}

export async function markDayAsCompleted(weekId: string, day: string, completed: boolean): Promise<void> {
    try {
        const dayIndex = WEEK_DAYS.indexOf(day as any);
        if (dayIndex === -1) {
            throw new Error('Invalid day name');
        }

        // Get current completed days
        const { data: weekData, error: fetchError } = await supabase
            .from('split_week')
            .select('completed_days')
            .eq('id', weekId)
            .single();

        if (fetchError) throw fetchError;

        let completedDays = weekData?.completed_days || [];

        // Update the completed array
        if (completed && !completedDays.includes(dayIndex)) {
            completedDays = [...completedDays, dayIndex];
        } else if (!completed) {
            completedDays = completedDays.filter((d: number) => d !== dayIndex);
        }

        // Update the week
        const { error: updateError } = await supabase
            .from('split_week')
            .update({ completed_days: completedDays })
            .eq('id', weekId);

        if (updateError) throw updateError;
    } catch (error) {
        console.error('Error marking day as completed:', error);
        throw error;
    }
}

export async function addReferenceWeek(
    referenceWeek: SplitWeek,
    usr_id: string
): Promise<void> {
    const currentWeek = getWeekNumber(new Date());

    try {
        // Create or update the split template
        let splitRecord = await getSplitIdByUser(usr_id);

        if (!splitRecord) {
            // Create new split
            const { data: newSplit, error: createError } = await supabase
                .from('split')
                .insert({
                    user_id: usr_id,
                    spl_ref_week: currentWeek
                })
                .select()
                .single();

            if (createError) throw createError;
            splitRecord = newSplit?.id;
        } else {
            // Update existing split's reference week
            const { error: updateError } = await supabase
                .from('split')
                .update({ spl_ref_week: currentWeek })
                .eq('id', splitRecord);

            if (updateError) throw updateError;
        }

        // Delete old split days
        await supabase
            .from('split_day')
            .delete()
            .eq('split_id', splitRecord);

        // Insert new split days
        const splitDaysData = WEEK_DAYS.map((day, index) => ({
            split_id: splitRecord,
            day_of_week: DAY_INDICES[index],
            workout_id: referenceWeek[day].workout?.id || null,
            ordinal: index
        }));

        const { error: insertError } = await supabase
            .from('split_day')
            .insert(splitDaysData);

        if (insertError) throw insertError;

        // Remove old split weeks (keep only recent ones for history)
        const twoWeeksAgo = getWeekNumber(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));
        await supabase
            .from('split_week')
            .delete()
            .eq('split_id', splitRecord)
            .lt('week_number', twoWeeksAgo);

    } catch (error) {
        console.error('Error adding reference week:', error);
        throw error;
    }
}

/**
 * Get or create a split week instance for tracking completion
 */
export async function getOrCreateSplitWeek(
    splitId: string,
    weekNumber: number
): Promise<string> {
    try {
        // Try to get existing week
        const { data: existing } = await supabase
            .from('split_week')
            .select('id')
            .eq('split_id', splitId)
            .eq('week_number', weekNumber)
            .single();

        if (existing?.id) {
            return existing.id;
        }

        // Create new week instance
        const { data: newWeek, error } = await supabase
            .from('split_week')
            .insert({
                split_id: splitId,
                week_number: weekNumber,
                completed_days: []
            })
            .select()
            .single();

        if (error) throw error;
        return newWeek?.id;
    } catch (error) {
        console.error('Error getting or creating split week:', error);
        throw error;
    }
}

/**
 * Convert split template to week data (simplified - no longer cycles through workouts)
 */
export function convertToWeekData(
    splitData: SplitWeek,
    _splitLength?: number
): SplitWeek[] {
    // With improved design, we just return the template week repeated
    // The actual week instances are created on demand in split_week table
    const numberOfFutureWeeks = 5;
    return Array(numberOfFutureWeeks).fill(null).map(() => splitData);
}
