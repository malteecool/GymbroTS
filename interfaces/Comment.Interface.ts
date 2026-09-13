export interface Comment {
    id: string;
    postId: string;
    /** The comment this one replies to, or null for a top-level comment. */
    parentCommentId: string | null;
    userId: string;
    body: string;
    createdAt: string;
    authorName: string;
    authorAvatarUrl: string | null;
    likeCount: number;
    likedByMe: boolean;
}

/** A top-level comment together with the replies grouped underneath it. */
export interface CommentThread extends Comment {
    replies: Comment[];
}

/** How the comment list is ordered. */
export type CommentSort = 'newest' | 'top';
