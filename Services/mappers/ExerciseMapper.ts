import { plainToInstance, Type } from 'class-transformer';
import { Exercise } from '../../interfaces/Exercise.Interface';

/**
 * Mapper for converting Supabase database rows to Exercise interface
 */
export class ExerciseMapper {
    /**
     * Convert Supabase database row to Exercise interface
     */
    static toDomain(row: any): Exercise {
        return {
            id: row.ID,
            exe_name: row.EXE_NAME,
            exe_user_id: row.EXE_USER_ID,
            exe_date: row.EXE_DATE || new Date().toISOString(),
            exe_max_reps: row.EXE_MAX_REPS,
            exe_max_weight: row.EXE_MAX_WEIGHT
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
     */
    static toSupabase(exercise: Partial<Exercise>): any {
        return {
            EXE_NAME: exercise.exe_name,
            EXE_USER_ID: exercise.exe_user_id,
            EXE_DATE: new Date().toISOString(),
            EXE_MAX_REPS: exercise.exe_max_reps ?? 0,
            EXE_MAX_WEIGHT: exercise.exe_max_weight ?? 0
        };
    }

    /**
     * Convert Exercise interface to Supabase update format
     */
    static toSupabaseUpdate(exercise: Partial<Exercise>): any {
        const update: any = {};
        
        if (exercise.exe_name !== undefined) update.EXE_NAME = exercise.exe_name;
        if (exercise.exe_date !== undefined) update.EXE_DATE = new Date().toISOString();
        if (exercise.exe_max_reps !== undefined) update.EXE_MAX_REPS = exercise.exe_max_reps;
        if (exercise.exe_max_weight !== undefined) update.EXE_MAX_WEIGHT = exercise.exe_max_weight;
        
        return update;
    }
}
