import { Set } from '../interfaces/Set.Interface';

/**
 * Mapper for converting Supabase database rows to Set interface
 */
export class SetMapper {
    /**
     * Convert Supabase database row to Set interface
     */
    static toDomain(row: any): Set {
        return {
            set_weight: row.SET_WEIGHT,
            set_reps: row.SET_REPS,
            set_order: row.SET_ORDER
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
            EXERCISE_HISTORY_ID: exerciseHistoryId,
            SET_WEIGHT: set.set_weight,
            SET_REPS: set.set_reps,
            SET_ORDER: order
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
