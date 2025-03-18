import { Workout } from "./Workout.Interface";

export interface Day {
    completed: boolean;
    day: string;
    weekId: string;
    workout: Workout; 
}

export interface Week {
    Monday: Day;
    Tuesday: Day;
    Wednesday: Day;
    Thursday: Day;
    Friday: Day;
    Saturday: Day;
    Sunday: Day;
}

export interface Split {
    splRefWeek: number | undefined;
    weeks: Week[];
}