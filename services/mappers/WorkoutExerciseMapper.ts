import { WorkoutExercise } from '../../interfaces/WorkoutExercise.Interface';

/**
 * Mapper for converting Supabase database rows to WorkoutExercise interface
 * Transforms snake_case database fields to camelCase domain properties
 */
export class WorkoutExerciseMapper {
    /**
     * Convert Supabase database row to WorkoutExercise interface
     */
    static toDomain(row: any): WorkoutExercise {
        return {
            id: row.EXERCISE_ID,
            woeId: row.WOE_ID,
            ordinal: row.ORDINAL,
            exeName: row.EXE_NAME,
            exeUserId: row.EXE_USER_ID,
            exeDate: row.EXE_DATE || new Date().toISOString(),
            exeMaxReps: row.EXE_MAX_REPS,
            exeMaxWeight: row.EXE_MAX_WEIGHT
        };
    }

    /**
     * Convert array of Supabase rows to WorkoutExercise interfaces
     */
    static toDomainList(rows: any[]): WorkoutExercise[] {
        return rows.map(row => this.toDomain(row));
    }

    /**
     * Convert WorkoutExercise interface to Supabase insert format
     */
    static toSupabase(workoutExercise: WorkoutExercise, workoutId: string): any {
        return {
            WORKOUT_ID: workoutId,
            EXERCISE_ID: workoutExercise.id,
            ORDINAL: workoutExercise.ordinal
        };
    }

    /**
     * Convert WorkoutExercise interface to Supabase update format
     */
    static toSupabaseUpdate(workoutExercise: Partial<WorkoutExercise>): any {
        const update: any = {};
        
        if (workoutExercise.ordinal !== undefined) update.ORDINAL = workoutExercise.ordinal;
        
        return update;
    }
}
