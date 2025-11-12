import { getFirebaseTimeStamp, getHistoryByUser } from './ExerciseService.Service';
import { User } from '../interfaces/User.Interface';

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
        const history = await getHistoryByUser(user.id);
        const dates = history
            .map(his => getFirebaseTimeStamp(his.exh_date.seconds, his.exh_date.nanoseconds))
            .map(date => date.toISOString().split('T')[0]);
        
        const uniqueDates = dates.filter(onlyUnique);
        const startOfWeekVariable = roundToDate(startOfWeek(new Date()));
        const weeklyDates = uniqueDates.filter(d => new Date(d) >= startOfWeekVariable);
        
        return { lifetime: uniqueDates, weekly: weeklyDates };
    } catch (error) {
        console.error('Error getting workouts count:', error);
        throw error;
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
