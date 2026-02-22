import { Set } from '../../interfaces/Set.Interface';

/**
 * Mapper for converting Supabase database rows to Set interface
 * Transforms snake_case database fields to camelCase domain properties
 */
export class SetMapper {
    /**
     * Convert Supabase database row to Set interface
     */
    static toDomain(row: any): Set {
        return {
            setWeight: row.set_weight,
            setReps: row.set_reps,
            setOrder: row.set_order
        };
    }

    /**
     * Convert array of Supabase rows to Set interfaces
     */
    static toDomainList(rows: any[]): Set[] {
        return rows.map(row => this.toDomain(row));
    }

    /**
     * Convert Set interface to Supabase insert format
     */
    static toSupabase(set: Set, exerciseHistoryId: string, order: number): any {
        return {
            exercise_history_id: exerciseHistoryId,
            set_weight: set.setWeight,
            set_reps: set.setReps,
            set_order: order
        };
    }

    /**
     * Convert Set interface array to Supabase insert format
     */
    static toSupabaseList(sets: Set[], exerciseHistoryId: string): any[] {
        return sets.map((set, index) => 
            this.toSupabase(set, exerciseHistoryId, index + 1)
        );
    }
}
