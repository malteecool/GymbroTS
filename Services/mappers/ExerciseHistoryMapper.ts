import { ExerciseHistory } from '../../interfaces/ExerciseHistory.Interface';
import { SetMapper } from './SetMapper';

/**
 * Mapper for converting Supabase database rows to ExerciseHistory interface
 */
export class ExerciseHistoryMapper {
    /**
     * Convert Supabase database row to ExerciseHistory interface
     * Requires sets to be passed separately or fetched separately
     */
    static toDomain(row: any, sets: any[] = []): ExerciseHistory {
        return {
            id: row.id,
            exh_date: row.exh_date,
            exh_sets: SetMapper.toDomainList(sets),
            exh_comment: row.exh_comment
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
            exh_comment: history.exh_comment || null
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
