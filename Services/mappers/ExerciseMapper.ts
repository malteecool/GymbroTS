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
            id: row.id,
            exe_name: row.exe_name,
            exe_user_id: row.exe_user_id,
            exe_date: row.exe_date || new Date().toISOString(),
            exe_max_reps: row.exe_max_reps,
            exe_max_weight: row.exe_max_weight
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
            exe_name: exercise.exe_name,
            exe_user_id: exercise.exe_user_id,
            exe_date: new Date().toISOString(),
            exe_max_reps: exercise.exe_max_reps ?? 0,
            exe_max_weight: exercise.exe_max_weight ?? 0
        };
    }

    /**
     * Convert Exercise interface to Supabase update format
     */
    static toSupabaseUpdate(exercise: Partial<Exercise>): any {
        const update: any = {};
        
        if (exercise.exe_name !== undefined) update.exe_name = exercise.exe_name;
        if (exercise.exe_date !== undefined) update.exe_date = new Date().toISOString();
        if (exercise.exe_max_reps !== undefined) update.exe_max_reps = exercise.exe_max_reps;
        if (exercise.exe_max_weight !== undefined) update.exe_max_weight = exercise.exe_max_weight;
        
        return update;
    }
}
