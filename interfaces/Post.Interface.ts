/**
 * 'text' is a standalone post written straight into the feed - it has no
 * workout behind it, so cards render it without an activity label.
 */
export type PostType = 'text' | 'workout_complete' | 'pr_broken' | 'milestone';

export interface Post {
    id: string;
    userId: string;
    workoutId: string | null;
    postType: PostType;
    caption: string | null;
    imageUrl: string | null;
    isPublic: boolean;
    createdAt: string;
    // Joined fields from feed query
    authorName: string;
    authorAvatarUrl: string | null;
    workoutName: string | null;
    likeCount: number;
    likedByMe: boolean;
    commentCount: number;
}

/** Emitted on the app event bus when a post's comment count changes. */
export const POST_COMMENT_COUNT_EVENT = 'postCommentCountChanged';

export interface PostCommentCountChange {
    postId: string;
    commentCount: number;
}
