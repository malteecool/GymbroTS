import { Set } from "./Set.Interface";


export interface ExerciseHistory {
    id: String;
    exh_date: { nanoseconds: number, seconds: number };
    exh_sets: Set[];
    exh_comment?: String;
}