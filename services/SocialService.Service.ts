import { supabase } from '../supabaseConfig';
import { PublicProfile } from '../interfaces/User.Interface';
import { createNotification } from './NotificationService.Service';

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
        .select('follower_id, app_user!follows_follower_id_fkey(id, name, bio, avatar_url, is_public)')
        .eq('following_id', userId);

    if (error) throw error;
    if (!data) return [];

    const myFollowingIds = me ? await getFollowingIds(me.id) : new Set<string>();

    return data
        .map((row: any) => row.app_user)
        .filter((u: any) => u && u.is_public)
        .map((u: any) => ({
            id: u.id,
            name: u.name,
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
        .select('following_id, app_user!follows_following_id_fkey(id, name, bio, avatar_url, is_public)')
        .eq('follower_id', userId);

    if (error) throw error;
    if (!data) return [];

    const myFollowingIds = me ? await getFollowingIds(me.id) : new Set<string>();

    return data
        .map((row: any) => row.app_user)
        .filter((u: any) => u && u.is_public)
        .map((u: any) => ({
            id: u.id,
            name: u.name,
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

    const { data, error } = await supabase
        .from('app_user')
        .select('id, name, bio, avatar_url')
        .eq('is_public', true)
        .ilike('name', `%${query}%`)
        .neq('id', me?.id ?? '')
        .limit(30);

    if (error) throw error;
    if (!data) return [];

    const myFollowingIds = me ? await getFollowingIds(me.id) : new Set<string>();

    return data.map((u: any) => ({
        id: u.id,
        name: u.name,
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
        .select('id, name, bio, avatar_url, is_public')
        .eq('id', userId)
        .eq('is_public', true)
        .maybeSingle();

    if (userError) throw userError;
    if (!userData) return null;

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
        bio: userData.bio ?? undefined,
        avatarUrl: userData.avatar_url ?? undefined,
        followerCount: followerRes.count ?? 0,
        followingCount: followingRes.count ?? 0,
        workoutCount: workoutRes.count ?? 0,
        isFollowedByMe: (isFollowedRes as any).data !== null,
    };
}

async function getFollowingIds(userId: string): Promise<Set<string>> {
    const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

    return new Set((data ?? []).map((row: any) => row.following_id));
}
