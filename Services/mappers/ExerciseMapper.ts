import { plainToInstance, Type } from 'class-transformer';
import { Exercise } from '../../interfaces/Exercise.Interface';

/**
 * Mapper for converting Supabase database rows to Exercise interface
 * Transforms snake_case database fields to camelCase domain properties
 */
export class ExerciseMapper {
    /**
     * Convert Supabase database row to Exercise interface
     */
    static toDomain(row: any): Exercise {
        return {
            id: row.id,
            exeName: row.exe_name,
            exeUserId: row.exe_user_id,
            exeDate: row.exe_date || new Date().toISOString(),
            exeMaxReps: row.exe_max_reps,
            exeMaxWeight: row.exe_max_weight
        };
    }

    /**
     * Convert array of Supabase rows to Exercise interfaces
     */
    static toDomainList(rows: any[]): Exercise[] {
        return rows.map(row => this.toDomain(row));
    }

    /**
     * Convert Exercise interface to Supabase insert format
     * Transforms camelCase domain properties to snake_case database fields
     */
    static toSupabase(exercise: Partial<Exercise>): any {
        return {
            exe_name: exercise.exeName,
            exe_user_id: exercise.exeUserId,
            exe_date: new Date().toISOString(),
            exe_max_reps: exercise.exeMaxReps ?? 0,
            exe_max_weight: exercise.exeMaxWeight ?? 0
        };
    }

    /**
     * Convert Exercise interface to Supabase update format
     */
    static toSupabaseUpdate(exercise: Partial<Exercise>): any {
        const update: any = {};
        
        if (exercise.exeName !== undefined) update.exe_name = exercise.exeName;
        if (exercise.exeDate !== undefined) update.exe_date = new Date().toISOString();
        if (exercise.exeMaxReps !== undefined) update.exe_max_reps = exercise.exeMaxReps;
        if (exercise.exeMaxWeight !== undefined) update.exe_max_weight = exercise.exeMaxWeight;
        
        return update;
    }
}
