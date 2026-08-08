import { supabase } from '../supabaseConfig';
import { Post, PostType } from '../interfaces/Post.Interface';
import { createNotification } from './NotificationService.Service';

const PAGE_SIZE = 20;

function rowToPost(row: any): Post {
    return {
        id: row.id,
        userId: row.user_id,
        workoutId: row.workout_id ?? null,
        postType: row.post_type as PostType,
        caption: row.caption ?? null,
        isPublic: row.is_public,
        createdAt: row.created_at,
        authorName: row.app_user?.name ?? '',
        authorAvatarUrl: row.app_user?.avatar_url ?? null,
        workoutName: row.workout?.wor_name ?? null,
        likeCount: row.reaction?.length ?? 0,
        likedByMe: false, // resolved separately
    };
}

export async function createPost(params: {
    workoutId: string | null;
    postType: PostType;
    caption?: string;
}): Promise<Post> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('post')
        .insert({
            user_id: user.id,
            workout_id: params.workoutId,
            post_type: params.postType,
            caption: params.caption ?? null,
            is_public: true,
        })
        .select(`
            *,
            app_user ( name, avatar_url ),
            workout ( wor_name ),
            reaction ( id )
        `)
        .single();

    if (error) throw error;
    return { ...rowToPost(data), likedByMe: false };
}

export async function getFeed(offset: number = 0): Promise<Post[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    return getFeedForUser(user.id, offset);
}

export async function getFeedForUser(userId: string, offset: number = 0): Promise<Post[]> {
    // Supabase JS doesn't support inline subqueries — fetch following IDs first
    const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

    const followingIds = (followData ?? []).map((f: any) => f.following_id);
    const userIds = [...followingIds, userId];

    const { data, error } = await supabase
        .from('post')
        .select(`
            *,
            app_user ( name, avatar_url ),
            workout ( wor_name ),
            reaction ( id, user_id )
        `)
        .in('user_id', userIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data) return [];

    return data.map((row: any) => ({
        ...rowToPost(row),
        likeCount: row.reaction?.length ?? 0,
        likedByMe: (row.reaction ?? []).some((r: any) => r.user_id === userId),
    }));
}

export async function getPostById(postId: string): Promise<Post | null> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('post')
        .select(`
            *,
            app_user ( name, avatar_url ),
            workout ( wor_name ),
            reaction ( id, user_id )
        `)
        .eq('id', postId)
        .single();

    if (error) throw error;
    if (!data) return null;

    return {
        ...rowToPost(data),
        likeCount: data.reaction?.length ?? 0,
        likedByMe: (data.reaction ?? []).some((r: any) => r.user_id === user?.id),
    };
}

export async function likePost(postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('reaction')
        .insert({ post_id: postId, user_id: user.id });

    if (error) throw error;

    const { data: post } = await supabase
        .from('post')
        .select('user_id')
        .eq('id', postId)
        .single();

    if (post) {
        await createNotification({
            recipientId: post.user_id,
            actorId: user.id,
            postId,
            notifType: 'like',
        });
    }
}

export async function unlikePost(postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('reaction')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

    if (error) throw error;
}

export async function deletePost(postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('post')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

    if (error) throw error;
}

