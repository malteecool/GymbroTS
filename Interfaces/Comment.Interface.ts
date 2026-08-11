export interface Comment {
    id: string;
    postId: string;
    userId: string;
    body: string;
    createdAt: string;
    authorName: string;
    authorAvatarUrl: string | null;
}
