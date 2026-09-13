import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../../constants/Theme';
import { Post } from '../../../interfaces/Post.Interface';
import { REPORT_REASONS, ReportReason } from '../../../interfaces/Report.Interface';
import { getPostById, likePost, unlikePost, deletePost } from '../../../services/PostService.Service';
import { blockUser, followUser, isFollowing, unfollowUser } from '../../../services/SocialService.Service';
import { reportPost } from '../../../services/ReportService.Service';
import { getStordUserData } from '../../../services/UserService.Service';
import { PostCard } from '../../../components/Social/PostCard';
import { CommentSection } from '../../../components/Social/CommentSection';
import { ActionSheet, ActionSheetOption } from '../../../components/ui/ActionSheet';

/** Which sheet is open: the options list, the report reasons, or neither. */
type SheetStage = 'closed' | 'options' | 'report';

export default function PostDetailScreen() {
    const { postId } = useLocalSearchParams<{ postId: string }>();
    const router = useRouter();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState('');
    const [followingAuthor, setFollowingAuthor] = useState<boolean | null>(null);
    const [followPending, setFollowPending] = useState(false);
    const [sheet, setSheet] = useState<SheetStage>('closed');

    const load = useCallback(async () => {
        if (!postId) return;
        try {
            setLoading(true);
            const [p, user] = await Promise.all([getPostById(postId), getStordUserData()]);
            setPost(p);
            if (user) setCurrentUserId(user.id);

            // Only worth asking for someone else's post - you cannot follow
            // yourself, and the card hides the button for your own posts.
            if (p && user && p.userId !== user.id) {
                setFollowingAuthor(await isFollowing(p.userId));
            } else {
                setFollowingAuthor(null);
            }
        } catch (e) {
            console.error('Error loading post:', e);
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => { load(); }, [load]);

    const handleLikeToggle = useCallback(async (p: Post) => {
        setPost(prev => prev ? {
            ...prev,
            likedByMe: !prev.likedByMe,
            likeCount: prev.likedByMe ? prev.likeCount - 1 : prev.likeCount + 1,
        } : prev);
        try {
            if (p.likedByMe) {
                await unlikePost(p.id);
            } else {
                await likePost(p.id);
            }
        } catch {
            setPost(prev => prev ? { ...prev, likedByMe: p.likedByMe, likeCount: p.likeCount } : prev);
        }
    }, []);

    const handleCommentCountChange = useCallback((count: number) => {
        setPost(prev => (prev && prev.commentCount !== count ? { ...prev, commentCount: count } : prev));
    }, []);

    const handleToggleFollow = useCallback(async (p: Post) => {
        if (followPending || followingAuthor === null) return;
        const next = !followingAuthor;
        setFollowPending(true);
        setFollowingAuthor(next);
        try {
            if (next) {
                await followUser(p.userId);
            } else {
                await unfollowUser(p.userId);
            }
        } catch (e) {
            console.error('Error updating follow state:', e);
            setFollowingAuthor(!next);
            Alert.alert('Error', 'Could not update follow. Please try again.');
        } finally {
            setFollowPending(false);
        }
    }, [followPending, followingAuthor]);

    const handleDelete = useCallback((p: Post) => {
        Alert.alert('Delete post', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deletePost(p.id);
                        router.back();
                    } catch {
                        Alert.alert('Error', 'Could not delete post. Please try again.');
                    }
                }
            },
        ]);
    }, [router]);

    const handleBlock = useCallback((p: Post) => {
        Alert.alert(
            `Block ${p.authorName}?`,
            "You won't see each other's posts, profiles or comments, and you'll both stop following each other. You can undo this in Settings.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block', style: 'destructive', onPress: async () => {
                        try {
                            await blockUser(p.userId);
                            // The post is no longer visible to this account, so
                            // staying on it would show a phantom.
                            router.back();
                        } catch (e) {
                            console.error('Error blocking user:', e);
                            Alert.alert('Error', 'Could not block this user. Please try again.');
                        }
                    }
                },
            ]
        );
    }, [router]);

    const handleReport = useCallback(async (reason: ReportReason) => {
        if (!post) return;
        setSheet('closed');
        try {
            await reportPost({ postId: post.id, reportedUserId: post.userId, reason });
            Alert.alert('Report sent', 'Thanks - we\'ll take a look at this post.');
        } catch (e) {
            console.error('Error reporting post:', e);
            Alert.alert('Error', 'Could not send the report. Please try again.');
        }
    }, [post]);

    if (loading) {
        return (
            <View style={styles.container}>
                <PostHeader onBack={() => router.back()} />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Theme.colors.font} />
                </View>
            </View>
        );
    }

    if (!post) {
        return (
            <View style={styles.container}>
                <PostHeader onBack={() => router.back()} />
                <View style={styles.centered}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={56} color={Theme.colors.secondary} />
                    <Text style={styles.notFoundText}>Post not found</Text>
                </View>
            </View>
        );
    }

    const isOwn = post.userId === currentUserId;

    const optionsForPost: ActionSheetOption[] = isOwn
        ? [{
            label: 'Delete post',
            icon: 'trash-can-outline',
            destructive: true,
            onPress: () => { setSheet('closed'); handleDelete(post); },
        }]
        : [
            {
                label: 'Report post',
                icon: 'flag-outline',
                destructive: true,
                onPress: () => setSheet('report'),
            },
            {
                label: `Block ${post.authorName}`,
                icon: 'account-cancel-outline',
                destructive: true,
                onPress: () => { setSheet('closed'); handleBlock(post); },
            },
        ];

    const reportOptions: ActionSheetOption[] = REPORT_REASONS.map(reason => ({
        label: reason.label,
        onPress: () => handleReport(reason.value),
    }));

    return (
        <View style={styles.container}>
            <PostHeader onBack={() => router.back()} onOptions={() => setSheet('options')} />

            <CommentSection
                postId={post.id}
                currentUserId={currentUserId}
                onCountChange={handleCommentCountChange}
                headerComponent={
                    <View style={styles.postWrapper}>
                        <PostCard
                            post={post}
                            onLikeToggle={handleLikeToggle}
                            currentUserId={currentUserId}
                            variant="detail"
                            isFollowingAuthor={followingAuthor}
                            onToggleFollow={handleToggleFollow}
                            followPending={followPending}
                        />
                    </View>
                }
            />

            <ActionSheet
                visible={sheet === 'options'}
                options={optionsForPost}
                onCancel={() => setSheet('closed')}
            />
            <ActionSheet
                visible={sheet === 'report'}
                title="Why are you reporting this post?"
                options={reportOptions}
                onCancel={() => setSheet('closed')}
                cancelLabel="Back"
            />
        </View>
    );
}

/**
 * Sits on the screen background rather than the header surface colour, so the
 * post card is the only thing on the screen that reads as raised.
 */
function PostHeader({ onBack, onOptions }: { onBack: () => void; onOptions?: () => void }) {
    return (
        <View style={styles.header}>
            <TouchableOpacity
                onPress={onBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
            >
                <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.colors.font} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Post</Text>

            {onOptions && (
                <TouchableOpacity
                    onPress={onOptions}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Post options"
                >
                    <MaterialCommunityIcons name="dots-horizontal" size={24} color={Theme.colors.font} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
        height: 50,
        paddingHorizontal: Theme.spacing.md,
        backgroundColor: Theme.colors.background,
    },
    headerTitle: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.bold,
    },
    postWrapper: {
        // The comment list already pads horizontally; only the gap under the
        // card is this view's to add.
        marginBottom: Theme.spacing.md,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.background,
        gap: Theme.spacing.md,
    },
    notFoundText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
    },
});
