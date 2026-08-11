import { Exercise } from "./Exercise.Interface";

export interface WorkoutExercise extends Exercise {
    woeId: string,
    ordinal: number
}