export type NotificationType = 'like' | 'comment' | 'follow' | 'reply' | 'comment_like';

export interface AppNotification {
    id: string;
    recipientId: string;
    actorId: string;
    actorName: string;
    actorAvatarUrl: string | null;
    postId: string | null;
    notifType: NotificationType;
    isRead: boolean;
    createdAt: string;
}
