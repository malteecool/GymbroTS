import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { Post } from '../../interfaces/Post.Interface';
import { Avatar } from '../ui/Avatar';

interface PostCardProps {
    post: Post;
    onLikeToggle: (post: Post) => void;
    /**
     * Opens the owner menu (edit / delete) behind the dots on your own posts.
     * The menu itself lives on the screen - see PostOwnerActions.
     */
    onOptions?: (post: Post) => void;
    /** Offered on other people's posts, so blocking is reachable from the feed. */
    onBlock?: (post: Post) => void;
    currentUserId: string;
    /**
     * 'feed' makes the card and its comment button open the post detail.
     * 'detail' is the card already on that screen, so both are inert.
     */
    variant?: 'feed' | 'detail';
    /**
     * Follow state for the author, or null while it is still unknown. Omit it
     * entirely and the card shows no follow button - the feed does, because
     * resolving this per row would be a query per card.
     */
    isFollowingAuthor?: boolean | null;
    onToggleFollow?: (post: Post) => void;
    followPending?: boolean;
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

/**
 * Only posts that announce an activity get the label row - a plain `text` post
 * is just the author and what they wrote, so it is left out of both maps.
 */
type ActivityPostType = Exclude<Post['postType'], 'text'>;

const POST_TYPE_ICON: Record<ActivityPostType, string> = {
    workout_complete: 'check-circle',
    pr_broken: 'trophy',
    milestone: 'star-circle',
};

const POST_TYPE_LABEL: Record<ActivityPostType, string> = {
    workout_complete: 'Completed a workout',
    pr_broken: 'Set a new PR',
    milestone: 'Hit a milestone',
};

export function PostCard({
    post,
    onLikeToggle,
    onOptions,
    onBlock,
    currentUserId,
    variant = 'feed',
    isFollowingAuthor,
    onToggleFollow,
    followPending,
}: PostCardProps) {
    const router = useRouter();
    const isOwn = post.userId === currentUserId;
    const isFeed = variant === 'feed';

    const openPost = () =>
        router.push({ pathname: '/social/post/[postId]', params: { postId: post.id } });

    // Hidden until the state is known, so the button never flips label under
    // the reader a moment after the card appears.
    const showFollow = !isOwn && !!onToggleFollow && isFollowingAuthor !== null
        && isFollowingAuthor !== undefined;

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

                {showFollow && (
                    <TouchableOpacity
                        style={[styles.followButton, isFollowingAuthor && styles.followingButton]}
                        onPress={() => onToggleFollow!(post)}
                        disabled={followPending}
                        activeOpacity={0.8}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        {followPending ? (
                            <ActivityIndicator
                                size="small"
                                color={isFollowingAuthor ? Theme.colors.font : Theme.colors.dark}
                            />
                        ) : (
                            <Text style={[styles.followText, isFollowingAuthor && styles.followingText]}>
                                {isFollowingAuthor ? 'Following' : 'Follow'}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                {isOwn && onOptions && (
                    <TouchableOpacity
                        onPress={() => onOptions(post)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Post options"
                    >
                        <MaterialCommunityIcons name="dots-vertical" size={20} color={Theme.colors.secondary} />
                    </TouchableOpacity>
                )}

                {!isOwn && onBlock && (
                    <TouchableOpacity
                        onPress={() => onBlock(post)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Post options"
                    >
                        <MaterialCommunityIcons name="dots-vertical" size={20} color={Theme.colors.secondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Activity label */}
            {post.postType !== 'text' && (
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
            )}

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
    followButton: {
        minWidth: 88,
        paddingVertical: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.round,
        backgroundColor: Theme.colors.yellow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    followingButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    followText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    followingText: {
        color: Theme.colors.font,
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
