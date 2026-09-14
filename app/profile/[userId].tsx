import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { PublicProfile } from '../../interfaces/User.Interface';
import { Post, PostCommentCountChange, POST_COMMENT_COUNT_EVENT } from '../../interfaces/Post.Interface';
import { getPublicProfile, followUser, unfollowUser, blockUser } from '../../services/SocialService.Service';
import { getPostsForUser, likePost, unlikePost, appendPostPage } from '../../services/PostService.Service';
import { getStordUserData } from '../../services/UserService.Service';
import emitter from '../../hooks/CustomEventEmitter';
import { PostCard } from '../../components/Social/PostCard';
import { PostOwnerActions } from '../../components/Social/PostOwnerActions';
import { ProfileHeader } from '../../components/Profile/ProfileHeader';

const PAGE_SIZE = 20;

export default function PublicProfileScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState('');

    const [posts, setPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    /** The post whose owner menu is open, or null when none is. */
    const [optionsPost, setOptionsPost] = useState<Post | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const load = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const [data, user] = await Promise.all([
                getPublicProfile(userId),
                getStordUserData(),
            ]);
            setProfile(data);
            if (user) setCurrentUserId(user.id);
        } catch (e) {
            console.error('Error loading profile:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const loadPosts = useCallback(async () => {
        if (!userId) return;
        try {
            setPostsLoading(true);
            const data = await getPostsForUser(userId, 0);
            setPosts(data);
            setHasMore(data.length === PAGE_SIZE);
        } catch (e) {
            console.error('Error loading user posts:', e);
        } finally {
            setPostsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        load();
        loadPosts();
    }, [load, loadPosts]);

    useEffect(() => {
        const onCommentCount = ({ postId, commentCount }: PostCommentCountChange) => {
            setPosts(prev => prev.map(p => (p.id === postId ? { ...p, commentCount } : p)));
        };
        emitter.on(POST_COMMENT_COUNT_EVENT, onCommentCount);

        return () => {
            emitter.off(POST_COMMENT_COUNT_EVENT, onCommentCount);
        };
    }, []);

    const loadMorePosts = useCallback(async () => {
        // `posts.length === 0` keeps this from fetching page 0: the list renders
        // empty while the initial load is still in flight, and an empty FlatList
        // fires onEndReached, which would append the page being loaded.
        if (!userId || loadingMore || !hasMore || postsLoading || posts.length === 0) return;
        try {
            setLoadingMore(true);
            const data = await getPostsForUser(userId, posts.length);
            setPosts(prev => appendPostPage(prev, data));
            setHasMore(data.length === PAGE_SIZE);
        } catch (e) {
            console.error('Error loading more posts:', e);
        } finally {
            setLoadingMore(false);
        }
    }, [userId, loadingMore, hasMore, postsLoading, posts.length]);

    const handleLikeToggle = useCallback(async (post: Post) => {
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
            setPosts(prev => prev.map(p => p.id === post.id ? {
                ...p,
                likedByMe: post.likedByMe,
                likeCount: post.likeCount,
            } : p));
        }
    }, []);

    const handlePostDeleted = useCallback((postId: string) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    }, []);

    const handlePostUpdated = useCallback((updated: Post) => {
        setPosts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    }, []);

    const handleBlock = useCallback(() => {
        if (!profile) return;
        Alert.alert(
            `Block ${profile.name}?`,
            "You won't see each other's posts, profiles or comments, and you'll both stop following each other. You can undo this in Settings.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block', style: 'destructive', onPress: async () => {
                        try {
                            await blockUser(profile.id);
                            // The profile is no longer visible to us, so leave it.
                            router.back();
                        } catch (e) {
                            console.error('Error blocking user:', e);
                            Alert.alert('Error', 'Could not block this user. Please try again.');
                        }
                    }
                },
            ]
        );
    }, [profile, router]);

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
        <>
        <FlatList
            style={styles.container}
            contentContainerStyle={styles.content}
            data={posts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
                <PostCard
                    post={item}
                    onLikeToggle={handleLikeToggle}
                    onOptions={setOptionsPost}
                    currentUserId={currentUserId}
                />
            )}
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={Theme.colors.secondary} style={styles.postsFooter} /> : null}
            ListHeaderComponent={
                <View style={styles.header}>
                    <ProfileHeader
                        avatarUrl={profile.avatarUrl}
                        name={profile.name}
                        handle={profile.handle}
                        bio={profile.bio}
                        followerCount={profile.followerCount}
                        followingCount={profile.followingCount}
                        workoutCount={profile.workoutCount}
                        onPressFollowers={() => router.push({ pathname: '/social/followers', params: { userId: profile.id, tab: 'followers' } })}
                        onPressFollowing={() => router.push({ pathname: '/social/followers', params: { userId: profile.id, tab: 'following' } })}
                        onPressWorkouts={() => router.push({ pathname: '/social/userWorkouts', params: { userId: profile.id, name: profile.name } })}
                        actionSlot={
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
                        }
                    />

                    <TouchableOpacity
                        style={styles.blockBtn}
                        onPress={handleBlock}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons name="cancel" size={16} color={Theme.colors.danger} />
                        <Text style={styles.blockBtnText}>Block {profile.name}</Text>
                    </TouchableOpacity>

                    <Text style={styles.postsTitle}>Posts</Text>
                    {postsLoading && (
                        <ActivityIndicator size="small" color={Theme.colors.secondary} style={styles.postsLoading} />
                    )}
                </View>
            }
            ListEmptyComponent={
                !postsLoading ? (
                    <View style={styles.postsEmpty}>
                        <MaterialCommunityIcons name="image-off-outline" size={48} color={Theme.colors.secondary} />
                        <Text style={styles.postsEmptyText}>No posts yet</Text>
                    </View>
                ) : null
            }
        />

        <PostOwnerActions
            post={optionsPost}
            onClose={() => setOptionsPost(null)}
            onDeleted={handlePostDeleted}
            onUpdated={handlePostUpdated}
        />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    content: {
        paddingBottom: Theme.spacing.xl,
        paddingHorizontal: Theme.spacing.md,
        flexGrow: 1,
    },
    header: {
        alignItems: 'center',
        paddingTop: Theme.spacing.xl,
        paddingBottom: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.sm,
    },
    blockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
    },
    blockBtnText: {
        color: Theme.colors.danger,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.medium,
    },
    postsTitle: {
        alignSelf: 'flex-start',
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.bold,
        marginTop: Theme.spacing.lg,
        marginBottom: Theme.spacing.sm,
    },
    postsLoading: {
        marginTop: Theme.spacing.md,
    },
    postsFooter: {
        paddingVertical: Theme.spacing.lg,
    },
    postsEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xl,
        gap: Theme.spacing.sm,
    },
    postsEmptyText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.background,
        gap: Theme.spacing.md,
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
        backgroundColor: Theme.colors.surface,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
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
