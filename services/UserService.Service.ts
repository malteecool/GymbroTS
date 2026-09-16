import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from "../interfaces/User.Interface";
import { supabase } from "../supabaseConfig";
import { UserMapper } from "./mappers/UserMapper";


export async function getUserDataById(id: string): Promise<User | null> {
    console.log("getting user data with id:" , id)
    try {
        const { data, error } = await supabase
            .from('app_user')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('1 Error fetching user data by id:', error);
            return null;
        }

        if (!data) {
            return null;
        }

        // Map the database row to domain User object
        const user = UserMapper.toDomainFromRow(data);
        return user;
    } catch (error) {
        console.error('2 Error fetching user data by id:', error);
        return null;
    }
}

export async function getStordUserData(): Promise<User | null> {
    try {
        const user = await AsyncStorage.getItem('user');
        return user ? JSON.parse(user) as User : null;
    } catch (error) {
        console.error('Error getting stored user data:', error);
        return null;
    }
}

export async function setStordUserData(userData: User): Promise<void> {
    try {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
        console.error('Error storing user data:', error);
        throw error;
    }
}

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;
const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

/** Lowercases and strips anything the handle format does not allow. */
export function normalizeHandle(raw: string): string {
    return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, HANDLE_MAX_LENGTH);
}

/**
 * Returns a message describing why the handle is unusable, or null if it is
 * fine. Mirrors the app_user_handle_format CHECK constraint, so the database
 * stays the backstop rather than the first line of feedback.
 */
export function validateHandle(handle: string): string | null {
    if (handle.length < HANDLE_MIN_LENGTH) {
        return `Handles need at least ${HANDLE_MIN_LENGTH} characters.`;
    }
    if (!HANDLE_PATTERN.test(handle)) {
        return 'Use only lowercase letters, numbers and underscores.';
    }
    return null;
}

/** Case-insensitive availability check, ignoring the user's current handle. */
export async function isHandleAvailable(handle: string, currentUserId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('app_user')
        .select('id')
        .ilike('handle', handle)
        .neq('id', currentUserId)
        .limit(1);

    if (error) throw error;
    return (data ?? []).length === 0;
}

export async function updateProfile(
    userId: string,
    updates: Partial<Pick<User, 'name' | 'bio' | 'avatarUrl' | 'handle'>>
): Promise<User> {
    const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.bio !== undefined) payload.bio = updates.bio ?? null;
    if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl ?? null;
    if (updates.handle !== undefined) payload.handle = updates.handle;

    const { data, error } = await supabase
        .from('app_user')
        .update(payload)
        .eq('id', userId)
        .select()
        .single();

    // The unique index is the real guarantee; the availability check before this
    // is only a nicer message, and two people can still race it.
    if (error?.code === '23505') {
        throw new Error('That handle is already taken.');
    }
    if (error) throw error;

    const updated = UserMapper.toDomainFromRow(data);
    await setStordUserData(updated);
    return updated;
}

export async function toggleVisibility(userId: string, isPublic: boolean): Promise<void> {
    const { error } = await supabase
        .from('app_user')
        .update({ is_public: isPublic, updated_at: new Date().toISOString() })
        .eq('id', userId);

    if (error) throw error;

    const stored = await getStordUserData();
    if (stored) {
        await setStordUserData({ ...stored, isPublic });
    }
}
