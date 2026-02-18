import { Set } from "./Set.Interface";


export interface ExerciseHistory {
    id?: string;
    exh_date: string;
    exh_sets: Set[];
    exh_comment?: string;
}