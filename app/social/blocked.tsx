import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Styles, Theme } from '../../constants/Theme';
import { PublicProfile } from '../../interfaces/User.Interface';
import { getBlockedUsers, unblockUser } from '../../services/SocialService.Service';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar } from '../../components/ui/Avatar';

export default function BlockedAccountsScreen() {
    const [blocked, setBlocked] = useState<PublicProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingId, setPendingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setBlocked(await getBlockedUsers());
        } catch (e) {
            console.error('Error loading blocked accounts:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleUnblock = useCallback((profile: PublicProfile) => {
        Alert.alert(
            `Unblock ${profile.name}?`,
            "You'll be able to see each other again. They will not start following you again automatically.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unblock', onPress: async () => {
                        try {
                            setPendingId(profile.id);
                            await unblockUser(profile.id);
                            setBlocked(prev => prev.filter(p => p.id !== profile.id));
                        } catch (e) {
                            console.error('Error unblocking user:', e);
                            Alert.alert('Error', 'Could not unblock this account. Please try again.');
                        } finally {
                            setPendingId(null);
                        }
                    }
                },
            ]
        );
    }, []);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Theme.colors.font} />
            </View>
        );
    }

    return (
        <View style={Styles.screen}>
            <FlatList
                data={blocked}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.row}>
                        <Avatar uri={item.avatarUrl ?? null} size={40} />
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.name}</Text>
                            {item.bio ? (
                                <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
                            ) : null}
                        </View>
                        <TouchableOpacity
                            style={styles.unblockBtn}
                            onPress={() => handleUnblock(item)}
                            disabled={pendingId === item.id}
                            activeOpacity={0.8}
                        >
                            {pendingId === item.id ? (
                                <ActivityIndicator size="small" color={Theme.colors.textPrimary} />
                            ) : (
                                <Text style={styles.unblockBtnText}>Unblock</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={
                    <EmptyState
                        icon="account-cancel-outline"
                        title="No blocked accounts"
                        subtitle="People you block won't see your posts or profile, and you won't see theirs."
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.background,
    },
    list: {
        padding: Theme.spacing.md,
        flexGrow: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
    },
    info: {
        flex: 1,
    },
    name: {
        ...Theme.typography.bodyStrong,
    },
    bio: {
        ...Theme.typography.meta,
        marginTop: 2,
    },
    unblockBtn: {
        paddingVertical: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
        minWidth: 84,
        alignItems: 'center',
    },
    unblockBtnText: {
        color: Theme.colors.textPrimary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
});
