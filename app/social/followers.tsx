import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { PublicProfile } from '../../interfaces/User.Interface';
import { getFollowers, getFollowing, followUser, unfollowUser } from '../../services/SocialService.Service';

type Tab = 'followers' | 'following';

export default function FollowersScreen() {
    const { userId, tab: initialTab } = useLocalSearchParams<{ userId: string; tab: Tab }>();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? 'followers');
    const [followers, setFollowers] = useState<PublicProfile[]>([]);
    const [following, setFollowing] = useState<PublicProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const [f1, f2] = await Promise.all([
                getFollowers(userId),
                getFollowing(userId),
            ]);
            setFollowers(f1);
            setFollowing(f2);
        } catch (e) {
            console.error('Error loading follows:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleFollowToggle = async (profile: PublicProfile, listType: Tab) => {
        try {
            if (profile.isFollowedByMe) {
                await unfollowUser(profile.id);
            } else {
                await followUser(profile.id);
            }
            const update = (list: PublicProfile[]) =>
                list.map(p => p.id === profile.id ? { ...p, isFollowedByMe: !p.isFollowedByMe } : p);

            if (listType === 'followers') setFollowers(update);
            else setFollowing(update);
        } catch (e) {
            console.error('Follow toggle error:', e);
        }
    };

    const renderItem = (listType: Tab) => ({ item }: { item: PublicProfile }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: item.id } })}
            activeOpacity={0.8}
        >
            <View style={styles.avatar}>
                <MaterialCommunityIcons name="account" size={28} color={Theme.colors.dark} />
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
            </View>
            <TouchableOpacity
                style={[styles.followBtn, item.isFollowedByMe && styles.followingBtn]}
                onPress={() => handleFollowToggle(item, listType)}
                activeOpacity={0.8}
            >
                <Text style={[styles.followBtnText, item.isFollowedByMe && styles.followingBtnText]}>
                    {item.isFollowedByMe ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const activeList = activeTab === 'followers' ? followers : following;

    return (
        <View style={styles.container}>
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
                    onPress={() => setActiveTab('followers')}
                >
                    <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
                        Followers
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'following' && styles.activeTab]}
                    onPress={() => setActiveTab('following')}
                >
                    <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
                        Following
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Theme.colors.font} />
                </View>
            ) : activeList.length === 0 ? (
                <View style={styles.centered}>
                    <MaterialCommunityIcons name="account-group-outline" size={56} color={Theme.colors.secondary} />
                    <Text style={styles.emptyText}>
                        {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={activeList}
                    keyExtractor={item => item.id}
                    renderItem={renderItem(activeTab)}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.lessDark,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: Theme.spacing.md,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: Theme.colors.yellow,
    },
    tabText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
    },
    activeTabText: {
        color: Theme.colors.font,
        fontWeight: Theme.fontWeight.semibold,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.md,
    },
    emptyText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        textAlign: 'center',
    },
    list: {
        paddingHorizontal: Theme.spacing.md,
        paddingTop: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        ...Theme.shadows.small,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Theme.colors.yellow,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Theme.spacing.md,
    },
    userInfo: {
        flex: 1,
        marginRight: Theme.spacing.sm,
    },
    userName: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    userBio: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        marginTop: 2,
    },
    followBtn: {
        backgroundColor: Theme.colors.yellow,
        paddingVertical: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.lg,
    },
    followingBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    followBtnText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    followingBtnText: {
        color: Theme.colors.secondary,
    },
});
