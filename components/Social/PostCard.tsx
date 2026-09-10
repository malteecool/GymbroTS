import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { Post } from '../../interfaces/Post.Interface';
import { Avatar } from '../ui/Avatar';

interface PostCardProps {
    post: Post;
    onLikeToggle: (post: Post) => void;
    onDelete?: (post: Post) => void;
    currentUserId: string;
    /**
     * 'feed' makes the card and its comment button open the post detail.
     * 'detail' is the card already on that screen, so both are inert.
     */
    variant?: 'feed' | 'detail';
}

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

const POST_TYPE_ICON: Record<Post['postType'], string> = {
    workout_complete: 'check-circle',
    pr_broken: 'trophy',
    milestone: 'star-circle',
};

const POST_TYPE_LABEL: Record<Post['postType'], string> = {
    workout_complete: 'Completed a workout',
    pr_broken: 'Set a new PR',
    milestone: 'Hit a milestone',
};

export function PostCard({ post, onLikeToggle, onDelete, currentUserId, variant = 'feed' }: PostCardProps) {
    const router = useRouter();
    const isOwn = post.userId === currentUserId;
    const isFeed = variant === 'feed';

    const openPost = () =>
        router.push({ pathname: '/social/post/[postId]', params: { postId: post.id } });

    const CardContainer = isFeed ? TouchableOpacity : View;

    return (
        <CardContainer
            style={styles.card}
            {...(isFeed ? { onPress: openPost, activeOpacity: 0.85 } : {})}
        >
            {/* Header row */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.authorRow}
                    onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: post.userId } })}
                    activeOpacity={0.7}
                >
                    <Avatar uri={post.authorAvatarUrl} size={40} />
                    <View>
                        <Text style={styles.authorName}>{post.authorName}</Text>
                        <Text style={styles.timestamp}>{timeAgo(post.createdAt)}</Text>
                    </View>
                </TouchableOpacity>

                {isOwn && onDelete && (
                    <TouchableOpacity onPress={() => onDelete(post)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialCommunityIcons name="dots-vertical" size={20} color={Theme.colors.secondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Activity label */}
            <View style={styles.activityRow}>
                <MaterialCommunityIcons
                    name={POST_TYPE_ICON[post.postType] as any}
                    size={16}
                    color={Theme.colors.yellow}
                />
                <Text style={styles.activityLabel}>{POST_TYPE_LABEL[post.postType]}</Text>
                {post.workoutName && (
                    <Text style={styles.workoutName}> · {post.workoutName}</Text>
                )}
            </View>

            {/* Photo */}
            {post.imageUrl ? (
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            ) : null}

            {/* Caption */}
            {post.caption ? (
                <Text style={styles.caption}>{post.caption}</Text>
            ) : null}

            {/* Footer: engagement actions */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.action}
                    onPress={() => onLikeToggle(post)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons
                        name={post.likedByMe ? 'heart' : 'heart-outline'}
                        size={22}
                        color={post.likedByMe ? Theme.colors.danger : Theme.colors.secondary}
                    />
                    {post.likeCount > 0 && (
                        <Text style={[styles.actionCount, post.likedByMe && styles.actionCountActive]}>
                            {post.likeCount}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.action}
                    onPress={openPost}
                    disabled={!isFeed}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons
                        name="comment-outline"
                        size={20}
                        color={Theme.colors.secondary}
                    />
                    <Text style={styles.actionCount}>
                        {post.commentCount > 0
                            ? post.commentCount
                            : isFeed ? 'Comment' : 'No comments yet'}
                    </Text>
                </TouchableOpacity>
            </View>
        </CardContainer>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        ...Theme.shadows.small,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Theme.spacing.sm,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        flex: 1,
    },
    authorName: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    timestamp: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
        marginTop: 1,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Theme.spacing.xs,
        gap: Theme.spacing.xs,
    },
    activityLabel: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
    },
    workoutName: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.medium,
    },
    postImage: {
        width: '100%',
        aspectRatio: 4 / 3,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.background,
        marginBottom: Theme.spacing.sm,
    },
    caption: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        lineHeight: Theme.lineHeight.md,
        marginBottom: Theme.spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.lg,
        marginTop: Theme.spacing.sm,
        paddingTop: Theme.spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Theme.colors.divider,
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    actionCount: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
    },
    actionCountActive: {
        color: Theme.colors.danger,
    },
});
