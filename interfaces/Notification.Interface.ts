export type NotificationType = 'like' | 'comment' | 'follow';

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
