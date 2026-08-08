import { Exercise } from "./Exercise.Interface";

export type WorkoutLinkType = 'copy' | 'follow';

export interface Workout {
    id: string;
    worCompletedCount: number;
    worEstimateTime: number;
    worLastDone: string;
    worName: string;
    worUserId: string;
    isPublic?: boolean;
    sourceWorkoutId?: string | null;
    linkType?: WorkoutLinkType | null;
    copyCount?: number;
    //worExercises?: Exercise[];
}