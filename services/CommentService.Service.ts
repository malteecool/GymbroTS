import { supabase } from '../supabaseConfig';
import { Comment, CommentSort, CommentThread } from '../interfaces/Comment.Interface';
import { createNotification } from './NotificationService.Service';
import { getBlockedIds } from './SocialService.Service';

const COMMENT_SELECT = `
    *,
    app_user ( name, avatar_url ),
    comment_reaction ( id, user_id )
`;

function rowToComment(row: any, viewerId?: string): Comment {
    return {
        id: row.id,
        postId: row.post_id,
        parentCommentId: row.parent_comment_id ?? null,
        userId: row.user_id,
        body: row.body,
        createdAt: row.created_at,
        authorName: row.app_user?.name ?? '',
        authorAvatarUrl: row.app_user?.avatar_url ?? null,
        likeCount: row.comment_reaction?.length ?? 0,
        likedByMe: (row.comment_reaction ?? []).some((r: any) => r.user_id === viewerId),
    };
}

/**
 * Groups a flat, chronologically ordered comment list into threads: every
 * top-level comment carries the replies that point at it.
 *
 * A reply whose parent is missing - blocked author, or a deeper nesting level
 * some other client wrote - is promoted to the top level rather than dropped,
 * so no visible comment disappears without a trace.
 */
export function buildCommentThreads(comments: Comment[]): CommentThread[] {
    const threads = new Map<string, CommentThread>();
    const orphans: Comment[] = [];

    for (const comment of comments) {
        if (!comment.parentCommentId) {
            threads.set(comment.id, { ...comment, replies: [] });
        }
    }

    for (const comment of comments) {
        if (!comment.parentCommentId) continue;
        const parent = threads.get(comment.parentCommentId);
        if (parent) {
            parent.replies.push(comment);
        } else {
            orphans.push(comment);
        }
    }

    return [...threads.values(), ...orphans.map(c => ({ ...c, replies: [] }))]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Total comments on the post, replies included - matches `post.commentCount`. */
export function countComments(threads: CommentThread[]): number {
    return threads.reduce((total, thread) => total + 1 + thread.replies.length, 0);
}

/**
 * Orders the top-level threads. Replies keep their chronological order inside a
 * thread whatever the sort is - a conversation read out of sequence is not a
 * conversation. `top` falls back to newest-first between equally liked threads
 * so the order stays stable rather than arbitrary.
 */
export function sortCommentThreads(threads: CommentThread[], sort: CommentSort): CommentThread[] {
    const byNewest = (a: CommentThread, b: CommentThread) => b.createdAt.localeCompare(a.createdAt);

    return [...threads].sort(sort === 'top'
        ? (a, b) => (b.likeCount - a.likeCount) || byNewest(a, b)
        : byNewest);
}

export async function getComments(postId: string): Promise<CommentThread[]> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('comment')
        .select(COMMENT_SELECT)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data) return [];

    // Filtered after fetching rather than in the query: comment lists are small
    // and unpaginated, so there is no page-size to protect.
    const blockedIds = user ? await getBlockedIds(user.id) : new Set<string>();
    const visible = blockedIds.size > 0
        ? data.filter((row: any) => !blockedIds.has(row.user_id))
        : data;

    return buildCommentThreads(visible.map((row: any) => rowToComment(row, user?.id)));
}

/**
 * Adds a comment to a post. Pass `parentCommentId` to hang it under an existing
 * comment as a reply, which notifies the author being answered on top of the
 * post owner. `createNotification` drops a notification aimed at its own actor,
 * so replying to yourself or under your own post stays quiet.
 */
export async function addComment(
    postId: string,
    body: string,
    parentCommentId?: string | null,
): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const trimmed = body.trim();
    if (!trimmed) throw new Error('Comment cannot be empty');

    const { data, error } = await supabase
        .from('comment')
        .insert({
            post_id: postId,
            user_id: user.id,
            body: trimmed,
            parent_comment_id: parentCommentId ?? null,
        })
        .select(COMMENT_SELECT)
        .single();

    if (error) throw error;

    const [postAuthorId, parentAuthorId] = await Promise.all([
        getPostAuthorId(postId),
        parentCommentId ? getCommentAuthorId(parentCommentId) : Promise.resolve(null),
    ]);

    // The post owner hears "commented on your post"; the person being answered
    // hears "replied to your comment". When they are the same person the reply
    // wording wins, so nobody is told twice about one reply.
    const notifications: { recipientId: string; notifType: 'comment' | 'reply' }[] = [];
    if (parentAuthorId) {
        notifications.push({ recipientId: parentAuthorId, notifType: 'reply' });
    }
    if (postAuthorId && postAuthorId !== parentAuthorId) {
        notifications.push({ recipientId: postAuthorId, notifType: 'comment' });
    }

    await Promise.all(notifications.map(n => createNotification({
        recipientId: n.recipientId,
        actorId: user.id,
        postId,
        notifType: n.notifType,
    })));

    return rowToComment(data, user.id);
}

async function getPostAuthorId(postId: string): Promise<string | null> {
    const { data } = await supabase
        .from('post')
        .select('user_id')
        .eq('id', postId)
        .single();

    return data?.user_id ?? null;
}

async function getCommentAuthorId(commentId: string): Promise<string | null> {
    const { data } = await supabase
        .from('comment')
        .select('user_id')
        .eq('id', commentId)
        .single();

    return data?.user_id ?? null;
}

/**
 * Deletes a comment. Replies are removed with it - the `parent_comment_id`
 * foreign key cascades - so a thread never outlives the comment it hangs off.
 */
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

/**
 * Likes a comment and tells its author. The unique (comment_id, user_id) index
 * makes a double tap a no-op at the database level rather than a second like.
 */
export async function likeComment(commentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('comment_reaction')
        .insert({ comment_id: commentId, user_id: user.id });

    if (error) throw error;

    const { data: comment } = await supabase
        .from('comment')
        .select('user_id, post_id')
        .eq('id', commentId)
        .single();

    if (comment) {
        await createNotification({
            recipientId: comment.user_id,
            actorId: user.id,
            postId: comment.post_id,
            notifType: 'comment_like',
        });
    }
}

export async function unlikeComment(commentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('comment_reaction')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

    if (error) throw error;
}
