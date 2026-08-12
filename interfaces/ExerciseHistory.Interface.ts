import { Set } from "./Set.Interface";


export interface ExerciseHistory {
    id?: string;
    exhDate: string;
    exhSets: Set[];
    exhComment?: string;
}