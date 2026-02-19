import { Set } from '../../interfaces/Set.Interface';

/**
 * Mapper for converting Supabase database rows to Set interface
 */
export class SetMapper {
    /**
     * Convert Supabase database row to Set interface
     */
    static toDomain(row: any): Set {
        return {
            set_weight: row.set_weight,
            set_reps: row.set_reps,
            set_order: row.set_order
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
            set_weight: set.set_weight,
            set_reps: set.set_reps,
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
