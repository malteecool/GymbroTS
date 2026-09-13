import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Post, PostCommentCountChange, POST_COMMENT_COUNT_EVENT } from '../../interfaces/Post.Interface';
import {
    getFeed, getExploreFeed, likePost, unlikePost, deletePost, appendPostPage,
} from '../../services/PostService.Service';
import { PostCard } from '../../components/Social/PostCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { IconButton } from '../../components/ui/IconButton';
import { getStordUserData } from '../../services/UserService.Service';
import { blockUser } from '../../services/SocialService.Service';
import { useNotificationContext } from '../../providers/NotificationProvider';
import emitter from '../../hooks/CustomEventEmitter';

const PAGE_SIZE = 20;

type FeedMode = 'following' | 'explore';

const FEED_TABS = [
    { value: 'following' as const, label: 'Following' },
    { value: 'explore' as const, label: 'Explore' },
];

const fetchFeed = (mode: FeedMode, offset: number) =>
    mode === 'following' ? getFeed(offset) : getExploreFeed(offset);

export default function SocialScreen() {
    const router = useRouter();
    const { unreadCount } = useNotificationContext();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentUserId, setCurrentUserId] = useState('');
    const [mode, setMode] = useState<FeedMode>('following');

    /**
     * Identifies the newest first-page request. Switching tabs faster than the
     * network can answer would otherwise let a stale feed land on top of the
     * one the user is actually looking at.
     */
    const requestRef = useRef(0);

    const load = useCallback(async (isRefresh: boolean = false) => {
        const token = ++requestRef.current;
        try {
            if (isRefresh) setRefreshing(true); else setLoading(true);
            const user = await getStordUserData();
            const data = await fetchFeed(mode, 0);
            if (token !== requestRef.current) return;
            if (user) setCurrentUserId(user.id);
            setPosts(data);
            setHasMore(data.length === PAGE_SIZE);
        } catch (e) {
            console.error('Error loading feed:', e);
        } finally {
            if (token === requestRef.current) {
                if (isRefresh) setRefreshing(false); else setLoading(false);
            }
        }
    }, [mode]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const onCommentCount = ({ postId, commentCount }: PostCommentCountChange) => {
            setPosts(prev => prev.map(p => (p.id === postId ? { ...p, commentCount } : p)));
        };
        emitter.on(POST_COMMENT_COUNT_EVENT, onCommentCount);

        return () => {
            emitter.off(POST_COMMENT_COUNT_EVENT, onCommentCount);
        };
    }, []);

    const loadMore = useCallback(async () => {
        // `posts.length === 0` is the important guard: switching tabs empties the
        // list, and an empty FlatList fires onEndReached before `load` has had a
        // chance to flip `loading`. Without this, that call would fetch page 0 and
        // append it on top of the page `load` is already fetching.
        if (loadingMore || !hasMore || loading || refreshing || posts.length === 0) return;

        const token = requestRef.current;
        try {
            setLoadingMore(true);
            const data = await fetchFeed(mode, posts.length);
            // A tab switch or refresh started while this page was in flight, so
            // it belongs to a list that is no longer on screen.
            if (token !== requestRef.current) return;
            setPosts(prev => appendPostPage(prev, data));
            setHasMore(data.length === PAGE_SIZE);
        } catch (e) {
            console.error('Error loading more posts:', e);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, loading, refreshing, posts.length, mode]);

    const handleLikeToggle = useCallback(async (post: Post) => {
        // Optimistic update
        setPosts(prev => prev.map(p => p.id === post.id ? {
            ...p,
            likedByMe: !p.likedByMe,
            likeCount: p.likedByMe ? p.likeCount - 1 : p.likeCount + 1,
        } : p));
        try {
            if (post.likedByMe) {
                await unlikePost(post.id);
            } else {
                await likePost(post.id);
            }
        } catch (e) {
            // Revert on failure
            setPosts(prev => prev.map(p => p.id === post.id ? {
                ...p,
                likedByMe: post.likedByMe,
                likeCount: post.likeCount,
            } : p));
        }
    }, []);

    const handleDelete = useCallback((post: Post) => {
        Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deletePost(post.id);
                        setPosts(prev => prev.filter(p => p.id !== post.id));
                    } catch (e) {
                        Alert.alert('Error', 'Could not delete post. Please try again.');
                    }
                }
            },
        ]);
    }, []);

    const handleBlock = useCallback((post: Post) => {
        Alert.alert(
            `Block ${post.authorName}?`,
            "You won't see each other's posts, profiles or comments, and you'll both stop following each other. You can undo this in Settings.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block', style: 'destructive', onPress: async () => {
                        try {
                            await blockUser(post.userId);
                            // Drop everything of theirs already on screen rather
                            // than refetching the whole feed.
                            setPosts(prev => prev.filter(p => p.userId !== post.userId));
                        } catch (e) {
                            console.error('Error blocking user:', e);
                            Alert.alert('Error', 'Could not block this user. Please try again.');
                        }
                    }
                },
            ]
        );
    }, []);

    const switchMode = useCallback((next: FeedMode) => {
        if (next === mode) return;
        // Invalidate here rather than waiting for `load` to do it, so a page
        // already in flight for the outgoing tab cannot land on the new list.
        requestRef.current++;
        setMode(next);
        setPosts([]);
        setHasMore(true);
    }, [mode]);

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <SegmentedTabs
                    options={FEED_TABS}
                    value={mode}
                    onChange={switchMode}
                    stretch
                    style={styles.feedTabs}
                />
                <View style={styles.topBarActions}>
                    <IconButton
                        icon="account-search-outline"
                        onPress={() => router.push('/social/discover')}
                        accessibilityLabel="Find people"
                        variant="plain"
                        size={24}
                    />
                    <IconButton
                        icon="bell-outline"
                        onPress={() => router.push('/social/notifications')}
                        accessibilityLabel="Notifications"
                        variant="plain"
                        size={24}
                        badgeCount={unreadCount}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Theme.colors.font} />
                </View>
            ) : (
            <FlatList
                data={posts}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        onLikeToggle={handleLikeToggle}
                        onDelete={handleDelete}
                        onBlock={handleBlock}
                        currentUserId={currentUserId}
                    />
                )}
                contentContainerStyle={styles.list}
                onEndReached={loadMore}
                onEndReachedThreshold={0.4}
                onRefresh={() => load(true)}
                refreshing={refreshing}
                ListFooterComponent={loadingMore ? <ActivityIndicator color={Theme.colors.secondary} style={styles.footer} /> : null}
                ListEmptyComponent={
                    mode === 'following' ? (
                        <EmptyState
                            icon="account-group-outline"
                            title="Your feed is empty"
                            subtitle="Follow people to see their workouts here, or browse Explore to find them."
                            style={styles.emptyState}
                            action={
                                <View style={styles.emptyActions}>
                                    <TouchableOpacity
                                        style={styles.discoverButton}
                                        onPress={() => switchMode('explore')}
                                        activeOpacity={0.8}
                                    >
                                        <MaterialCommunityIcons name="compass-outline" size={20} color={Theme.colors.textOnAccent} />
                                        <Text style={styles.discoverButtonText}>Browse Explore</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.secondaryButton}
                                        onPress={() => router.push('/social/discover')}
                                        activeOpacity={0.8}
                                    >
                                        <MaterialCommunityIcons name="magnify" size={20} color={Theme.colors.textPrimary} />
                                        <Text style={styles.secondaryButtonText}>Find People</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                        />
                    ) : (
                        <EmptyState
                            icon="compass-outline"
                            title="Nothing to explore yet"
                            subtitle="Public posts from public profiles show up here. Yours are hidden from this list."
                            style={styles.emptyState}
                        />
                    )
                }
            />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
    },
    feedTabs: {
        // Claims the row's leftover width so the pills reach the action buttons.
        flex: 1,
    },
    topBarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.background,
    },
    list: {
        padding: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl,
        flexGrow: 1,
    },
    footer: {
        paddingVertical: Theme.spacing.lg,
    },
    emptyState: {
        flex: 1,
        paddingTop: '20%',
    },
    emptyActions: {
        gap: Theme.spacing.sm,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.sm,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.xl,
        borderRadius: Theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    secondaryButtonText: {
        color: Theme.colors.textPrimary,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    discoverButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.accent,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.xl,
        borderRadius: Theme.borderRadius.lg,
        justifyContent: 'center',
        ...Theme.shadows.small,
    },
    discoverButtonText: {
        color: Theme.colors.textOnAccent,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
});
