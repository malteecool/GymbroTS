import { supabase } from '../supabaseConfig';
import { PublicProfile } from '../interfaces/User.Interface';
import { createNotification } from './NotificationService.Service';

/**
 * Ids the viewer must not see and must not be seen by: everyone they have
 * blocked, plus everyone who has blocked them.
 *
 * Blocking is mutual, so every list that surfaces other people's content runs
 * through this. Note it is enforced in the query layer only — with RLS disabled
 * a determined client could still read the rows directly.
 */
export async function getBlockedIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
        .from('block')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    if (error) throw error;

    const ids = new Set<string>();
    for (const row of data ?? []) {
        ids.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id);
    }
    return ids;
}

/** Convenience wrapper for the signed-in user; empty when signed out. */
export async function getBlockedIdsForCurrentUser(): Promise<Set<string>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Set<string>();
    return getBlockedIds(user.id);
}

export async function isBlocked(otherUserId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
        .from('block')
        .select('id')
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`)
        .limit(1);

    if (error) throw error;
    return (data ?? []).length > 0;
}

/**
 * Blocks a user and severs the relationship in both directions.
 *
 * Dropping the follows matters: leaving them in place would keep the blocked
 * user in follower counts and lists, and would resurrect the connection the
 * moment the block is lifted.
 */
export async function blockUser(blockedId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (user.id === blockedId) throw new Error('Cannot block yourself');

    const { error } = await supabase
        .from('block')
        .upsert(
            { blocker_id: user.id, blocked_id: blockedId },
            { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true }
        );

    if (error) throw error;

    const { error: followError } = await supabase
        .from('follows')
        .delete()
        .or(`and(follower_id.eq.${user.id},following_id.eq.${blockedId}),and(follower_id.eq.${blockedId},following_id.eq.${user.id})`);

    if (followError) throw followError;
}

/** Lifts a block. Follows are not restored — they were deleted, not suspended. */
export async function unblockUser(blockedId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('block')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId);

    if (error) throw error;
}

/** Accounts the viewer has blocked, for the management list in settings. */
export async function getBlockedUsers(): Promise<PublicProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('block')
        .select('blocked_id, app_user!block_blocked_id_fkey ( id, name, handle, bio, avatar_url )')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? [])
        .filter((row: any) => row.app_user)
        .map((row: any) => ({
            id: row.app_user.id,
            name: row.app_user.name,
            handle: row.app_user.handle,
            bio: row.app_user.bio ?? undefined,
            avatarUrl: row.app_user.avatar_url ?? undefined,
            followerCount: 0,
            followingCount: 0,
            workoutCount: 0,
            isFollowedByMe: false,
        }));
}

export async function followUser(followingId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: followingId });

    if (error) throw error;

    await createNotification({
        recipientId: followingId,
        actorId: user.id,
        notifType: 'follow',
    });
}

export async function unfollowUser(followingId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId);

    if (error) throw error;
}

export async function isFollowing(followingId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', followingId)
        .maybeSingle();

    if (error) throw error;
    return data !== null;
}

export async function getFollowers(userId: string): Promise<PublicProfile[]> {
    const { data: { user: me } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('follows')
        .select('follower_id, app_user!follows_follower_id_fkey(id, name, handle, bio, avatar_url, is_public)')
        .eq('following_id', userId);

    if (error) throw error;
    if (!data) return [];

    const myFollowingIds = me ? await getFollowingIds(me.id) : new Set<string>();
    const blockedIds = me ? await getBlockedIds(me.id) : new Set<string>();

    return data
        .map((row: any) => row.app_user)
        .filter((u: any) => u && u.is_public && !blockedIds.has(u.id))
        .map((u: any) => ({
            id: u.id,
            name: u.name,
            handle: u.handle,
            bio: u.bio ?? undefined,
            avatarUrl: u.avatar_url ?? undefined,
            followerCount: 0,
            followingCount: 0,
            workoutCount: 0,
            isFollowedByMe: myFollowingIds.has(u.id),
        }));
}

export async function getFollowing(userId: string): Promise<PublicProfile[]> {
    const { data: { user: me } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('follows')
        .select('following_id, app_user!follows_following_id_fkey(id, name, handle, bio, avatar_url, is_public)')
        .eq('follower_id', userId);

    if (error) throw error;
    if (!data) return [];

    const myFollowingIds = me ? await getFollowingIds(me.id) : new Set<string>();
    const blockedIds = me ? await getBlockedIds(me.id) : new Set<string>();

    return data
        .map((row: any) => row.app_user)
        .filter((u: any) => u && u.is_public && !blockedIds.has(u.id))
        .map((u: any) => ({
            id: u.id,
            name: u.name,
            handle: u.handle,
            bio: u.bio ?? undefined,
            avatarUrl: u.avatar_url ?? undefined,
            followerCount: 0,
            followingCount: 0,
            workoutCount: 0,
            isFollowedByMe: myFollowingIds.has(u.id),
        }));
}

export async function searchUsers(query: string): Promise<PublicProfile[]> {
    const { data: { user: me } } = await supabase.auth.getUser();

    const blockedIds = me ? await getBlockedIds(me.id) : new Set<string>();

    let request = supabase
        .from('app_user')
        .select('id, name, handle, bio, avatar_url')
        .eq('is_public', true)
        // Match either the display name or the handle, so "@malte" and "Malte"
        // both find the same person.
        .or(`name.ilike.%${query}%,handle.ilike.%${query}%`)
        .neq('id', me?.id ?? '');

    // Filtered in the query rather than after, so blocked accounts do not eat
    // into the row limit.
    if (blockedIds.size > 0) {
        request = request.not('id', 'in', `(${[...blockedIds].join(',')})`);
    }

    const { data, error } = await request.limit(30);

    if (error) throw error;
    if (!data) return [];

    const myFollowingIds = me ? await getFollowingIds(me.id) : new Set<string>();

    return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        handle: u.handle,
        bio: u.bio ?? undefined,
        avatarUrl: u.avatar_url ?? undefined,
        followerCount: 0,
        followingCount: 0,
        workoutCount: 0,
        isFollowedByMe: myFollowingIds.has(u.id),
    }));
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
    const { data: { user: me } } = await supabase.auth.getUser();

    const { data: userData, error: userError } = await supabase
        .from('app_user')
        .select('id, name, handle, bio, avatar_url, is_public')
        .eq('id', userId)
        .eq('is_public', true)
        .maybeSingle();

    if (userError) throw userError;
    if (!userData) return null;

    // Blocking is mutual, so the profile is simply not there for either party.
    // The screen already renders "Profile not found or private" for null.
    if (me) {
        const blockedIds = await getBlockedIds(me.id);
        if (blockedIds.has(userId)) return null;
    }

    const [followerRes, followingRes, workoutRes, isFollowedRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('workout').select('id', { count: 'exact', head: true }).eq('wor_user_id', userId),
        me
            ? supabase.from('follows').select('id').eq('follower_id', me.id).eq('following_id', userId).maybeSingle()
            : Promise.resolve({ data: null }),
    ]);

    return {
        id: userData.id,
        name: userData.name,
        handle: userData.handle,
        bio: userData.bio ?? undefined,
        avatarUrl: userData.avatar_url ?? undefined,
        followerCount: followerRes.count ?? 0,
        followingCount: followingRes.count ?? 0,
        workoutCount: workoutRes.count ?? 0,
        isFollowedByMe: (isFollowedRes as any).data !== null,
    };
}

export async function getOwnProfileStats(userId: string): Promise<{ followerCount: number; followingCount: number; workoutCount: number }> {
    const [followerRes, followingRes, workoutRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('workout').select('id', { count: 'exact', head: true }).eq('wor_user_id', userId),
    ]);

    return {
        followerCount: followerRes.count ?? 0,
        followingCount: followingRes.count ?? 0,
        workoutCount: workoutRes.count ?? 0,
    };
}

async function getFollowingIds(userId: string): Promise<Set<string>> {
    const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

    return new Set((data ?? []).map((row: any) => row.following_id));
}
