import AsyncStorage from '@react-native-async-storage/async-storage';
import { Milestone, MilestoneKind, PersonalRecord } from '../interfaces/Achievement.Interface';
import { getWorkoutsCount, getWorkoutStreak } from './StatsService.Service';
import { User } from '../interfaces/User.Interface';

const WORKOUT_COUNT_THRESHOLDS = [10, 25, 50, 100, 250, 500, 1000];
const STREAK_THRESHOLDS = [7, 14, 30, 60, 90, 180, 365];

/** Highest threshold the value has reached, or null if it has reached none. */
function highestReached(value: number, thresholds: number[]): number | null {
    const reached = thresholds.filter(t => value >= t);
    return reached.length > 0 ? reached[reached.length - 1] : null;
}

function offeredKey(userId: string, kind: MilestoneKind, value: number): string {
    return `milestoneOffered:${userId}:${kind}:${value}`;
}

/**
 * Whether this milestone has already been put in front of the user.
 *
 * Kept in local storage rather than a table: a milestone only drives a
 * one-time share prompt, so it does not need to survive a reinstall, and this
 * keeps the feature free of a schema migration. If milestone history ever needs
 * to be queryable server-side, this is the piece to replace.
 */
async function hasBeenOffered(userId: string, milestone: Milestone): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(offeredKey(userId, milestone.kind, milestone.value))) !== null;
    } catch (error) {
        console.error('Error reading milestone state:', error);
        // Treat unknown as already offered so a storage fault cannot spam prompts.
        return true;
    }
}

export async function markMilestoneOffered(userId: string, milestone: Milestone): Promise<void> {
    try {
        await AsyncStorage.setItem(offeredKey(userId, milestone.kind, milestone.value), new Date().toISOString());
    } catch (error) {
        console.error('Error saving milestone state:', error);
    }
}

/**
 * The single most significant milestone the user has reached and not yet been
 * offered, or null. Deliberately returns at most one so finishing a workout
 * never produces a queue of prompts.
 */
export async function detectMilestone(user: User): Promise<Milestone | null> {
    try {
        const [counts, streak] = await Promise.all([
            getWorkoutsCount(user),
            getWorkoutStreak(user.id),
        ]);

        const candidates: Milestone[] = [];

        const countValue = highestReached(counts.lifetime.length, WORKOUT_COUNT_THRESHOLDS);
        if (countValue !== null) candidates.push({ kind: 'workout_count', value: countValue });

        const streakValue = highestReached(streak, STREAK_THRESHOLDS);
        if (streakValue !== null) candidates.push({ kind: 'streak', value: streakValue });

        for (const candidate of candidates) {
            if (!(await hasBeenOffered(user.id, candidate))) return candidate;
        }

        return null;
    } catch (error) {
        console.error('Error detecting milestone:', error);
        return null;
    }
}

/** Drops a trailing .0 so 92.5 stays 92.5 but 100.0 reads as 100. */
function formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Short line naming the achievement, shown in the share sheet. */
export function describePersonalRecords(records: PersonalRecord[]): string {
    if (records.length === 0) return '';

    const parts = records.map(r =>
        r.kind === 'weight' ? `${formatNumber(r.value)} kg` : `${formatNumber(r.value)} reps`
    );

    return `${records[0].exerciseName} — ${parts.join(' · ')}`;
}

/**
 * Default caption for a PR post. A `pr_broken` post carries no workout, so
 * without this the feed card would read only "Set a new PR" with no detail.
 */
export function personalRecordCaption(records: PersonalRecord[]): string {
    if (records.length === 0) return '';

    const parts = records.map(r => {
        const unit = r.kind === 'weight' ? 'kg' : 'reps';
        return r.previousValue > 0
            ? `${formatNumber(r.value)} ${unit} (was ${formatNumber(r.previousValue)})`
            : `${formatNumber(r.value)} ${unit}`;
    });

    return `New PR on ${records[0].exerciseName}: ${parts.join(', ')}`;
}

export function describeMilestone(milestone: Milestone): string {
    return milestone.kind === 'workout_count'
        ? `${milestone.value} workouts`
        : `${milestone.value} day streak`;
}

export function milestoneCaption(milestone: Milestone): string {
    return milestone.kind === 'workout_count'
        ? `${milestone.value} workouts logged.`
        : `${milestone.value} days in a row.`;
}
