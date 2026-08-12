export type PostType = 'workout_complete' | 'pr_broken' | 'milestone';

export interface Post {
    id: string;
    userId: string;
    workoutId: string | null;
    postType: PostType;
    caption: string | null;
    isPublic: boolean;
    createdAt: string;
    // Joined fields from feed query
    authorName: string;
    authorAvatarUrl: string | null;
    workoutName: string | null;
    likeCount: number;
    likedByMe: boolean;
}
