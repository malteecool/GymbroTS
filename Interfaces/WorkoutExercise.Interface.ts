import { Exercise } from "./Exercise.Interface";

export interface WorkoutExercise extends Exercise {
    woe_id: string,
    ordinal: number
}