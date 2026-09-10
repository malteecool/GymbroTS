import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Avatar } from '../ui/Avatar';

interface ProfileHeaderProps {
    avatarUrl?: string | null;
    editableAvatar?: boolean;
    avatarUploading?: boolean;
    onAvatarPress?: () => void;

    name: string;
    bio?: string | null;
    nameBioSlot?: React.ReactNode;

    followerCount: number;
    followingCount: number;
    workoutCount: number;
    onPressFollowers?: () => void;
    onPressFollowing?: () => void;
    onPressWorkouts?: () => void;

    actionSlot?: React.ReactNode;
}

export function ProfileHeader({
    avatarUrl,
    editableAvatar,
    avatarUploading,
    onAvatarPress,
    name,
    bio,
    nameBioSlot,
    followerCount,
    followingCount,
    workoutCount,
    onPressFollowers,
    onPressFollowing,
    onPressWorkouts,
    actionSlot,
}: ProfileHeaderProps) {
    return (
        <View style={styles.container}>
            <View style={styles.avatarRow}>
                {editableAvatar ? (
                    <TouchableOpacity
                        style={styles.avatarTouchable}
                        onPress={onAvatarPress}
                        activeOpacity={0.8}
                        disabled={avatarUploading}
                    >
                        <Avatar uri={avatarUrl} size={96} />
                        {avatarUploading ? (
                            <View style={styles.avatarOverlay}>
                                <ActivityIndicator size="small" color={Theme.colors.white} />
                            </View>
                        ) : (
                            <View style={styles.avatarEditBadge}>
                                <MaterialCommunityIcons name="camera" size={16} color={Theme.colors.dark} />
                            </View>
                        )}
                    </TouchableOpacity>
                ) : (
                    <Avatar uri={avatarUrl} size={96} />
                )}
            </View>

            {nameBioSlot ?? (
                <>
                    <Text style={styles.name}>{name}</Text>
                    {bio ? <Text style={styles.bio}>{bio}</Text> : null}
                </>
            )}

            <View style={styles.statsRow}>
                <TouchableOpacity style={styles.stat} onPress={onPressFollowers} disabled={!onPressFollowers}>
                    <Text style={styles.statNumber}>{followerCount}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity style={styles.stat} onPress={onPressFollowing} disabled={!onPressFollowing}>
                    <Text style={styles.statNumber}>{followingCount}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity style={styles.stat} onPress={onPressWorkouts} disabled={!onPressWorkouts}>
                    <Text style={styles.statNumber}>{workoutCount}</Text>
                    <Text style={styles.statLabel}>Workouts</Text>
                </TouchableOpacity>
            </View>

            {actionSlot}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        width: '100%',
    },
    avatarRow: {
        marginBottom: Theme.spacing.md,
    },
    avatarTouchable: {
        position: 'relative',
    },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 48,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Theme.colors.yellow,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Theme.colors.dark,
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
        backgroundColor: Theme.colors.surface,
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
});
