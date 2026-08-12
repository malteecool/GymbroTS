import { supabase } from '../supabaseConfig';
import { AppNotification, NotificationType } from '../interfaces/Notification.Interface';

const PAGE_SIZE = 30;

function rowToNotification(row: any): AppNotification {
    return {
        id: row.id,
        recipientId: row.recipient_id,
        actorId: row.actor_id,
        actorName: row.actor?.name ?? '',
        actorAvatarUrl: row.actor?.avatar_url ?? null,
        postId: row.post_id ?? null,
        notifType: row.notif_type as NotificationType,
        isRead: row.is_read,
        createdAt: row.created_at,
    };
}

export async function createNotification(params: {
    recipientId: string;
    actorId: string;
    postId?: string | null;
    notifType: NotificationType;
}): Promise<void> {
    if (params.recipientId === params.actorId) return;

    const { error } = await supabase
        .from('notification')
        .insert({
            recipient_id: params.recipientId,
            actor_id: params.actorId,
            post_id: params.postId ?? null,
            notif_type: params.notifType,
        });

    if (error) throw error;
}

export async function getNotifications(offset: number = 0): Promise<AppNotification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('notification')
        .select(`
            *,
            actor:actor_id ( name, avatar_url )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data) return [];

    return data.map(rowToNotification);
}

export async function getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
        .from('notification')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

    if (error) throw error;
    return count ?? 0;
}

export async function markRead(notificationId: string): Promise<void> {
    const { error } = await supabase
        .from('notification')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) throw error;
}

export async function markAllRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('notification')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

    if (error) throw error;
}
