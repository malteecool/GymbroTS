import { supabase } from '../supabaseConfig';
import { Comment } from '../interfaces/Comment.Interface';
import { createNotification } from './NotificationService.Service';

function rowToComment(row: any): Comment {
    return {
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        body: row.body,
        createdAt: row.created_at,
        authorName: row.app_user?.name ?? '',
        authorAvatarUrl: row.app_user?.avatar_url ?? null,
    };
}

export async function getComments(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
        .from('comment')
        .select(`
            *,
            app_user ( name, avatar_url )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data) return [];

    return data.map(rowToComment);
}

export async function addComment(postId: string, body: string): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const trimmed = body.trim();
    if (!trimmed) throw new Error('Comment cannot be empty');

    const { data, error } = await supabase
        .from('comment')
        .insert({ post_id: postId, user_id: user.id, body: trimmed })
        .select(`
            *,
            app_user ( name, avatar_url )
        `)
        .single();

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
            notifType: 'comment',
        });
    }

    return rowToComment(data);
}

export async function deleteComment(commentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('comment')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

    if (error) throw error;
}
