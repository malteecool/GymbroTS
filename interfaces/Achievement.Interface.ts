/** Which record an exercise session beat. */
export type PersonalRecordKind = 'weight' | 'reps';

export interface PersonalRecord {
    exerciseId: string;
    exerciseName: string;
    kind: PersonalRecordKind;
    /** The new record. */
    value: number;
    /** What it beat. 0 means this is the first logged session for the exercise. */
    previousValue: number;
}

/** Which counter crossed a threshold. */
export type MilestoneKind = 'workout_count' | 'streak';

export interface Milestone {
    kind: MilestoneKind;
    /** The threshold that was reached, e.g. 100 workouts or a 30 day streak. */
    value: number;
}
