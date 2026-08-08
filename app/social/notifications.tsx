import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { AppNotification, NotificationType } from '../../interfaces/Notification.Interface';
import { getNotifications, markAllRead } from '../../services/NotificationService.Service';
import { useNotificationContext } from '../../providers/NotificationProvider';

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

const NOTIF_ICON: Record<NotificationType, string> = {
    like: 'heart',
    comment: 'comment-text',
    follow: 'account-plus',
};

const NOTIF_MESSAGE: Record<NotificationType, string> = {
    like: 'liked your post',
    comment: 'commented on your post',
    follow: 'started following you',
};

export default function NotificationsScreen() {
    const router = useRouter();
    const { markAllAsRead } = useNotificationContext();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getNotifications();
            setNotifications(data);
        } catch (e) {
            console.error('Error loading notifications:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        markAllRead().then(markAllAsRead).catch(e => console.error('Error marking notifications read:', e));
    }, [markAllAsRead]);

    const handlePress = useCallback((item: AppNotification) => {
        if (item.postId) {
            router.push({ pathname: '/social/post/[postId]', params: { postId: item.postId } });
        } else {
            router.push({ pathname: '/profile/[userId]', params: { userId: item.actorId } });
        }
    }, [router]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Theme.colors.font} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.row, !item.isRead && styles.rowUnread]}
                        onPress={() => handlePress(item)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.iconWrap}>
                            <MaterialCommunityIcons
                                name={NOTIF_ICON[item.notifType] as any}
                                size={20}
                                color={Theme.colors.yellow}
                            />
                        </View>
                        <View style={styles.textWrap}>
                            <Text style={styles.message}>
                                <Text style={styles.actorName}>{item.actorName}</Text> {NOTIF_MESSAGE[item.notifType]}
                            </Text>
                            <Text style={styles.timestamp}>{timeAgo(item.createdAt)}</Text>
                        </View>
                    </TouchableOpacity>
                )}
                onRefresh={load}
                refreshing={loading}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="bell-outline" size={56} color={Theme.colors.secondary} />
                        <Text style={styles.emptyText}>No notifications yet</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
    },
    list: {
        padding: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl,
        flexGrow: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        gap: Theme.spacing.md,
    },
    rowUnread: {
        borderLeftWidth: 3,
        borderLeftColor: Theme.colors.yellow,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Theme.colors.dark,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        flex: 1,
    },
    message: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        lineHeight: Theme.lineHeight.sm,
    },
    actorName: {
        fontWeight: Theme.fontWeight.semibold,
    },
    timestamp: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
        marginTop: 2,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '30%',
        gap: Theme.spacing.md,
    },
    emptyText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
    },
});
