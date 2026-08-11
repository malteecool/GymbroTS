import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Post } from '../../interfaces/Post.Interface';
import { getFeed, likePost, unlikePost, deletePost } from '../../services/PostService.Service';
import { PostCard } from '../../components/Social/PostCard';
import { getStordUserData } from '../../services/UserService.Service';

const PAGE_SIZE = 20;

export default function SocialScreen() {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentUserId, setCurrentUserId] = useState('');

    const load = useCallback(async (isRefresh: boolean = false) => {
        try {
            if (isRefresh) setRefreshing(true); else setLoading(true);
            const user = await getStordUserData();
            if (user) setCurrentUserId(user.id);
            const data = await getFeed(0);
            setPosts(data);
            setHasMore(data.length === PAGE_SIZE);
        } catch (e) {
            console.error('Error loading feed:', e);
        } finally {
            if (isRefresh) setRefreshing(false); else setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        try {
            setLoadingMore(true);
            const data = await getFeed(posts.length);
            setPosts(prev => [...prev, ...data]);
            setHasMore(data.length === PAGE_SIZE);
        } catch (e) {
            console.error('Error loading more posts:', e);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, posts.length]);

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
                data={posts}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        onLikeToggle={handleLikeToggle}
                        onDelete={handleDelete}
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
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="account-group-outline" size={72} color={Theme.colors.secondary} />
                        <Text style={styles.emptyTitle}>Your feed is empty</Text>
                        <Text style={styles.emptySubtitle}>Follow people to see their workouts here</Text>
                        <TouchableOpacity
                            style={styles.discoverButton}
                            onPress={() => router.push('/social/discover')}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="magnify" size={20} color={Theme.colors.dark} />
                            <Text style={styles.discoverButtonText}>Find People</Text>
                        </TouchableOpacity>
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
    footer: {
        paddingVertical: Theme.spacing.lg,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Theme.spacing.xl,
        gap: Theme.spacing.md,
        paddingTop: '30%',
    },
    emptyTitle: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.xl,
        fontWeight: Theme.fontWeight.bold,
        textAlign: 'center',
    },
    emptySubtitle: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        textAlign: 'center',
        marginBottom: Theme.spacing.sm,
    },
    discoverButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.yellow,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.xl,
        borderRadius: Theme.borderRadius.lg,
        ...Theme.shadows.small,
    },
    discoverButtonText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
});
