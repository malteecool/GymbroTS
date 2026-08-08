import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { PublicProfile } from '../../interfaces/User.Interface';
import { getPublicProfile, followUser, unfollowUser } from '../../services/SocialService.Service';

export default function PublicProfileScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);

    const load = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const data = await getPublicProfile(userId);
            setProfile(data);
        } catch (e) {
            console.error('Error loading profile:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleFollowToggle = async () => {
        if (!profile) return;
        try {
            setFollowLoading(true);
            if (profile.isFollowedByMe) {
                await unfollowUser(profile.id);
                setProfile(p => p ? {
                    ...p,
                    isFollowedByMe: false,
                    followerCount: p.followerCount - 1,
                } : p);
            } else {
                await followUser(profile.id);
                setProfile(p => p ? {
                    ...p,
                    isFollowedByMe: true,
                    followerCount: p.followerCount + 1,
                } : p);
            }
        } catch (e) {
            Alert.alert('Error', 'Could not update follow status. Please try again.');
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Theme.colors.font} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.centered}>
                <MaterialCommunityIcons name="account-off-outline" size={64} color={Theme.colors.secondary} />
                <Text style={styles.notFoundText}>Profile not found or private</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                    <MaterialCommunityIcons name="account" size={52} color={Theme.colors.dark} />
                </View>
            </View>

            <Text style={styles.name}>{profile.name}</Text>
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            <View style={styles.statsRow}>
                <TouchableOpacity
                    style={styles.stat}
                    onPress={() => router.push({ pathname: '/social/followers', params: { userId: profile.id, tab: 'followers' } })}
                >
                    <Text style={styles.statNumber}>{profile.followerCount}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity
                    style={styles.stat}
                    onPress={() => router.push({ pathname: '/social/followers', params: { userId: profile.id, tab: 'following' } })}
                >
                    <Text style={styles.statNumber}>{profile.followingCount}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity
                    style={styles.stat}
                    onPress={() => router.push({ pathname: '/social/userWorkouts', params: { userId: profile.id, name: profile.name } })}
                >
                    <Text style={styles.statNumber}>{profile.workoutCount}</Text>
                    <Text style={styles.statLabel}>Workouts</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.followBtn, profile.isFollowedByMe && styles.followingBtn]}
                onPress={handleFollowToggle}
                disabled={followLoading}
                activeOpacity={0.8}
            >
                {followLoading ? (
                    <ActivityIndicator size="small" color={profile.isFollowedByMe ? Theme.colors.font : Theme.colors.dark} />
                ) : (
                    <>
                        <MaterialCommunityIcons
                            name={profile.isFollowedByMe ? 'account-check' : 'account-plus'}
                            size={20}
                            color={profile.isFollowedByMe ? Theme.colors.font : Theme.colors.dark}
                        />
                        <Text style={[styles.followBtnText, profile.isFollowedByMe && styles.followingBtnText]}>
                            {profile.isFollowedByMe ? 'Following' : 'Follow'}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    content: {
        alignItems: 'center',
        paddingTop: Theme.spacing.xl,
        paddingBottom: Theme.spacing.xl,
        paddingHorizontal: Theme.spacing.lg,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
        gap: Theme.spacing.md,
    },
    avatarRow: {
        marginBottom: Theme.spacing.md,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: Theme.colors.yellow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.xxl,
        fontWeight: Theme.fontWeight.bold,
        textAlign: 'center',
        marginBottom: Theme.spacing.xs,
    },
    bio: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        textAlign: 'center',
        marginBottom: Theme.spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.lg,
        marginBottom: Theme.spacing.lg,
        width: '100%',
        ...Theme.shadows.small,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.xl,
        fontWeight: Theme.fontWeight.bold,
    },
    statLabel: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: Theme.colors.border,
    },
    followBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.yellow,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.xl,
        borderRadius: Theme.borderRadius.lg,
        width: '100%',
        justifyContent: 'center',
        ...Theme.shadows.small,
    },
    followingBtn: {
        backgroundColor: Theme.colors.lessDark,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    followBtnText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    followingBtnText: {
        color: Theme.colors.font,
    },
    notFoundText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        textAlign: 'center',
    },
    backBtn: {
        marginTop: Theme.spacing.sm,
    },
    backBtnText: {
        color: Theme.colors.yellow,
        fontSize: Theme.fontSize.md,
    },
});
