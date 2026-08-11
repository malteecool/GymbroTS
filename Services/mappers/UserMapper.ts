import { User } from '../../interfaces/User.Interface';
import type { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Mapper for converting Supabase user data to User interface
 */
export class UserMapper {
    /**
     * Convert Supabase User to domain User interface
     */
    static toDomain(supabaseUser: SupabaseUser): User {
        return {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.name || '',
        };
    }

    /**
     * Convert database row to User interface
     */
    static toDomainFromRow(row: any): User {
        return {
            id: row.ID || row.id,
            email: row.EMAIL || row.email,
            name: row.NAME || row.name || '',
            bio: row.BIO || row.bio || undefined,
            avatarUrl: row.AVATAR_URL || row.avatar_url || undefined,
            isPublic: row.IS_PUBLIC ?? row.is_public ?? false,
        };
    }

    /**
     * Convert User interface to Supabase insert format
     * Database fields use UPPERCASE
     */
    static toSupabase(user: User): any {
        return {
            ID: user.id,
            EMAIL: user.email,
            NAME: user.name,
            BIO: user.bio,
            AVATAR_URL: user.avatarUrl,
            IS_PUBLIC: user.isPublic ?? false,
        };
    }

    /**
     * Convert User interface to Supabase update format
     */
    static toSupabaseUpdate(user: Partial<User>): any {
        const update: any = {};

        if (user.email !== undefined) update.EMAIL = user.email;
        if (user.name !== undefined) update.NAME = user.name;
        if (user.bio !== undefined) update.BIO = user.bio;
        if (user.avatarUrl !== undefined) update.AVATAR_URL = user.avatarUrl;
        if (user.isPublic !== undefined) update.IS_PUBLIC = user.isPublic;

        return update;
    }

    /**
     * Merge Supabase auth user with database user data
     */
    static mergeAuthWithDb(authUser: SupabaseUser, dbUser?: any): User {
        if (dbUser) {
            return this.toDomainFromRow(dbUser);
        }

        // Fallback to auth user data if no db entry
        return this.toDomain(authUser);
    }
}
