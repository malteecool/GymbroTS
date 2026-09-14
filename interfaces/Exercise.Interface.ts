import { MuscleGroup } from '../constants/MuscleGroups';

export interface Exercise {
    id: string;
    exeName: string;
    exeUserId: string;
    exeDate: string;
    exeMaxReps: number;
    exeMaxWeight: number;
    /** Primary muscle worked. null when the exercise has not been categorised. */
    exeMuscleGroup: MuscleGroup | null;
}