import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseConfig';
import { getUnreadCount } from '../services/NotificationService.Service';

export function useNotifications(userId: string | undefined) {
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(async () => {
        if (!userId) {
            setUnreadCount(0);
            return;
        }
        try {
            const count = await getUnreadCount();
            setUnreadCount(count);
        } catch (e) {
            console.error('Error fetching unread notification count:', e);
        }
    }, [userId]);

    useEffect(() => { refresh(); }, [refresh]);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`notifications-${userId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notification', filter: `recipient_id=eq.${userId}` },
                () => setUnreadCount(prev => prev + 1)
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const markAllAsRead = useCallback(() => {
        setUnreadCount(0);
    }, []);

    return { unreadCount, refresh, markAllAsRead };
}
