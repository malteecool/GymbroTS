import { Exercise } from "./Exercise.Interface";

export interface Workout {
    id: string;
    wor_completed_count: number;
    wor_estimate_time: number;
    wor_last_done: string;
    wor_name: string;
    wor_user_id: string;
    //wor_exercises?: Exercise[];
}