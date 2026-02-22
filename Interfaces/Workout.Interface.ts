import { Exercise } from "./Exercise.Interface";

export interface Workout {
    id: string;
    worCompletedCount: number;
    worEstimateTime: number;
    worLastDone: string;
    worName: string;
    worUserId: string;
    //worExercises?: Exercise[];
}