import { ExerciseHistory } from '../../interfaces/ExerciseHistory.Interface';
import { SetMapper } from './SetMapper';
import { Set } from '../../interfaces/Set.Interface';

/**
 * Mapper for converting Supabase database rows to ExerciseHistory interface
 * Transforms snake_case database fields to camelCase domain properties
 * Requires sets to be passed separately or fetched separately
 */
export class ExerciseHistoryMapper {
    /**
     * Convert Supabase database row to ExerciseHistory interface
     * Sets can be either raw database rows (need mapping) or already mapped Set instances
     */
    static toDomain(row: any, sets: any[] = []): ExerciseHistory {
        // Check if sets are already mapped (domain instances) or need mapping
        // Domain Set instances have camelCase properties like setWeight
        const mappedSets = sets.length > 0 && 'setWeight' in sets[0]
            ? sets  // Already mapped
            : SetMapper.toDomainList(sets);  // Need mapping
        
        return {
            id: row.id,
            exhDate: row.exh_date,
            exhSets: mappedSets,
            exhComment: row.exh_comment
        };
    }

    /**
     * Convert array of Supabase rows to ExerciseHistory interfaces
     */
    static toDomainList(rows: any[]): ExerciseHistory[] {
        return rows.map(row => this.toDomain(row));
    }

    /**
     * Convert ExerciseHistory interface to Supabase insert format
     */
    static toSupabase(history: ExerciseHistory, exerciseId: string): any {
        return {
            exercise_id: exerciseId,
            exh_date: this.dateToSupabase(new Date()),
            exh_comment: history.exhComment || null
        };
    }

    /**
     * Convert a date to Supabase timestamp format
     */
    static dateToSupabase(date: Date): string {
        return date.toISOString();
    }

    /**
     * Convert Supabase timestamp to JavaScript Date
     */
    static supabaseToDate(timestamp: string): Date {
        return new Date(timestamp);
    }
}
