import { WorkoutExercise } from "../../interfaces/WorkoutExercise.Interface";
import { Workout } from "../../Interfaces/Workout.Interface";

export async function getWorkouts(usr_id: string): any;

export async function getWorkoutById(wor_id: string): any;

export async function updateWorkout(workout: Workout, timer: number);

export async function getWorkoutExercises(workoutId: string): WorkoutExercise[];

export async function updateWorkoutExerciseOrdinal(wor_id, woe_id, ordinal);

export function removeWorkout(workoutId: string);

export async function attachToWorkout(exerciseId: string, workoutId: string, ordinal: number);

export async function getDefaultWorkouts();

export async function addWorkoutWithExercises(workoutName: string, selectedExercises: Exercise[], usr_id: string);

export async function addWorkout(name: string, usr_id: string);

export const getFormattedTime;