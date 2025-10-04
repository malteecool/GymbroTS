import { Exercise } from "../../Interfaces/Exercise.Interface";
import { Set } from "../../Interfaces/Set.Interface";

export async function getExercises(usr_id: string): any;

export async function getExerciseById(exe_id: string): Exercise;

export async function getHistory(exerciseId: string, date?: Date): any;

export async function addExercise(name: string, usr_id: string): any;

export async function addExerciseHistory(exercise: Exercise, sets: Set[], comment?: string): any;

export function getFirebaseTimeStamp(seconds: number, nanoseconds: number): Date;

export async function removeExercise(exe_id: string, usr_id: string);

export async function removeWorkoutExercise(workout_id: string, exe_id: string, usr_id: string | null);

export async function getHistoryByUser(userId: string): any;

export async function getDefaultExercises(): Exercise[];