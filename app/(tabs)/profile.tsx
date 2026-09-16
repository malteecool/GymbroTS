import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, TextInput, FlatList } from "react-native";
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ProfileHeader } from '../../components/Profile/ProfileHeader';
import { IconButton } from '../../components/ui/IconButton';
import { PostCard } from '../../components/Social/PostCard';
import { PostOwnerActions } from '../../components/Social/PostOwnerActions';
import CounterComponent from '../../components/AnimateNumber';
import BarGraph from '../../components/BarGraph';
import { getWorkoutsCount, getWeekNumber } from '../../services/StatsService.Service';
import emitter from '../../hooks/CustomEventEmitter';
import {
    getStordUserData, updateProfile, normalizeHandle, validateHandle, isHandleAvailable,
    HANDLE_MAX_LENGTH,
} from '../../services/UserService.Service';
import { getOwnProfileStats } from '../../services/SocialService.Service';
import { getPostsForUser, likePost, unlikePost, appendPostPage } from '../../services/PostService.Service';
import { pickImage, uploadAvatar } from '../../services/ImageUploadService.Service';
import { User } from '../../interfaces/User.Interface';
import { Post, PostCommentCountChange, POST_COMMENT_COUNT_EVENT } from '../../interfaces/Post.Interface';
import { Theme } from '../../constants/Theme';
import { useImagePickerHost } from '../../providers/ImagePickerHostProvider';

type ProfileTab = 'posts' | 'stats';
const POSTS_PAGE_SIZE = 20;

function computeTrend(lifetimeDates: string[]): { x: number[]; y: number[] } {
    const currentWeek = getWeekNumber(new Date());
    const groupedDates = lifetimeDates.reduce((result: Record<number, string[]>, date: string) => {
        const weekNumber = getWeekNumber(new Date(date));
        if (!result[weekNumber]) {
            result[weekNumber] = [];
        }
        result[weekNumber].push(date);
        return result;
    }, {});

    const xArray: number[] = [];
    const yArray: number[] = [];

    for (let i = 0; i < 5; i++) {
        let x = currentWeek - i;
        if (x < 1) {
            x = 52 - Math.abs(x);
        }
        xArray.push(x);
        yArray.push(groupedDates[x] ? groupedDates[x].length : 0);
    }

    // Reverse arrays to show 5 weeks ago on the left and current week on the right
    xArray.reverse();
    yArray.reverse();

    return { x: xArray, y: yArray };
}

export default function ProfileScreen() {
    const router = useRouter();
    const { requestImageSource } = useImagePickerHost();
    const [countsLoading, setCountsLoading] = useState(true);
    const [workoutCounts, setWorkoutCounts] = useState<{ weekly: string[]; lifetime: string[] } | null>(null);
    const [trend, setTrend] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
    const [user, setUser] = useState<User | null>(null);
    const [profileStats, setProfileStats] = useState({ followerCount: 0, followingCount: 0, workoutCount: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editHandle, setEditHandle] = useState('');
    const [handleError, setHandleError] = useState<string | null>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
    const [posts, setPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    /** The post whose owner menu is open, or null when none is. */
    const [optionsPost, setOptionsPost] = useState<Post | null>(null);
    const [loadingMorePosts, setLoadingMorePosts] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);

    const load = useCallback(async () => {
        try {
            const storedUser = await getStordUserData();
            if (!storedUser) {
                console.error('User not found');
                return;
            }

            setUser(storedUser);
            setCountsLoading(true);

            const [counts, stats] = await Promise.all([
                getWorkoutsCount(storedUser),
                getOwnProfileStats(storedUser.id),
            ]);

            setProfileStats(stats);

            if (counts) {
                setWorkoutCounts(counts);
                setTrend(computeTrend(counts.lifetime));
            }
            setCountsLoading(false);
        } catch (error) {
            console.error('Error loading profile data:', error);
        }
    }, []);

    const loadPosts = useCallback(async (userId: string) => {
        try {
            setPostsLoading(true);
            const data = await getPostsForUser(userId, 0);
            setPosts(data);
            setHasMorePosts(data.length === POSTS_PAGE_SIZE);
        } catch (e) {
            console.error('Error loading posts:', e);
        } finally {
            setPostsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (user?.id) loadPosts(user.id);
    }, [user?.id, loadPosts]);

    useEffect(() => {
        const listener = () => {
            load();
            (async () => {
                const storedUser = await getStordUserData();
                if (storedUser) loadPosts(storedUser.id);
            })();
        };
        emitter.on('profileEvent', listener);

        return () => {
            emitter.off('profileEvent', listener);
        };
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
        if (!user || loadingMorePosts || !hasMorePosts || postsLoading || posts.length === 0) return;
        try {
            setLoadingMorePosts(true);
            const data = await getPostsForUser(user.id, posts.length);
            setPosts(prev => appendPostPage(prev, data));
            setHasMorePosts(data.length === POSTS_PAGE_SIZE);
        } catch (e) {
            console.error('Error loading more posts:', e);
        } finally {
            setLoadingMorePosts(false);
        }
    }, [user, loadingMorePosts, hasMorePosts, postsLoading, posts.length]);

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

    const handleEnterEdit = () => {
        setEditName(user?.name ?? '');
        setEditBio(user?.bio ?? '');
        setEditHandle(user?.handle ?? '');
        setHandleError(null);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        if (!editName.trim()) {
            return;
        }

        const handle = normalizeHandle(editHandle);
        const formatError = validateHandle(handle);
        if (formatError) {
            setHandleError(formatError);
            return;
        }

        try {
            setEditSaving(true);
            setHandleError(null);

            if (handle !== user.handle && !(await isHandleAvailable(handle, user.id))) {
                setHandleError('That handle is already taken.');
                return;
            }

            const updated = await updateProfile(user.id, {
                name: editName.trim(),
                bio: editBio.trim() || undefined,
                handle,
            });
            setUser(updated);
            setIsEditing(false);
        } catch (e: any) {
            console.error('Error saving profile:', e);
            setHandleError(e?.message ?? 'Could not save your profile. Please try again.');
        } finally {
            setEditSaving(false);
        }
    };

    const handlePickAvatar = async () => {
        if (!user) return;
        try {
            const source = await requestImageSource();
            if (!source) return;
            const uri = await pickImage(source, { aspect: [1, 1] });
            if (!uri) return;
            setAvatarUploading(true);
            const avatarUrl = await uploadAvatar(user.id, uri);
            const updated = await updateProfile(user.id, {
                name: user.name,
                bio: user.bio,
                avatarUrl,
            });
            setUser(updated);
        } catch (e: any) {
            console.error('Error updating profile picture:', e);
        } finally {
            setAvatarUploading(false);
        }
    };

    const listHeader = (
        <View style={styles.headerWrap}>
            <View style={styles.topActions}>
                <IconButton
                    icon="cog-outline"
                    onPress={() => router.push('/profile/settings')}
                    accessibilityLabel="Settings"
                />
            </View>
            <ProfileHeader
                avatarUrl={user?.avatarUrl}
                editableAvatar
                avatarUploading={avatarUploading}
                onAvatarPress={handlePickAvatar}
                name={user?.name ?? ''}
                handle={isEditing ? undefined : user?.handle}
                bio={user?.bio}
                nameBioSlot={isEditing ? (
                    <View style={styles.editForm}>
                        <Text style={styles.inputLabel}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Your name"
                            placeholderTextColor={Theme.colors.placeholder}
                            maxLength={60}
                        />

                        <Text style={styles.inputLabel}>Handle</Text>
                        <View style={styles.handleInputRow}>
                            <Text style={styles.handlePrefix}>@</Text>
                            <TextInput
                                style={styles.handleInput}
                                value={editHandle}
                                onChangeText={(text) => {
                                    setEditHandle(normalizeHandle(text));
                                    setHandleError(null);
                                }}
                                placeholder="yourhandle"
                                placeholderTextColor={Theme.colors.placeholder}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={HANDLE_MAX_LENGTH}
                            />
                        </View>
                        {handleError ? (
                            <Text style={styles.handleError}>{handleError}</Text>
                        ) : (
                            <Text style={styles.handleHint}>
                                Lowercase letters, numbers and underscores. This is how people find you.
                            </Text>
                        )}

                        <Text style={styles.inputLabel}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            value={editBio}
                            onChangeText={setEditBio}
                            placeholder="Tell people about your training..."
                            placeholderTextColor={Theme.colors.placeholder}
                            multiline
                            maxLength={160}
                        />
                    </View>
                ) : undefined}
                followerCount={profileStats.followerCount}
                followingCount={profileStats.followingCount}
                workoutCount={profileStats.workoutCount}
                onPressFollowers={() => user && router.push({ pathname: '/social/followers', params: { userId: user.id, tab: 'followers' } })}
                onPressFollowing={() => user && router.push({ pathname: '/social/followers', params: { userId: user.id, tab: 'following' } })}
                onPressWorkouts={() => router.push('/workout/allWorkouts')}
                actionSlot={isEditing ? (
                    <View style={styles.editActionsRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.cancelBtn]}
                            onPress={handleCancelEdit}
                            disabled={editSaving}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.saveBtn, editSaving && styles.saveButtonDisabled]}
                            onPress={handleSaveProfile}
                            disabled={editSaving}
                            activeOpacity={0.8}
                        >
                            {editSaving ? (
                                <ActivityIndicator size="small" color={Theme.colors.dark} />
                            ) : (
                                <Text style={styles.saveBtnText}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.editProfileBtn}
                        onPress={handleEnterEdit}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={Theme.colors.font} />
                        <Text style={styles.editProfileBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                )}
            />

            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'posts' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('posts')}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name="view-grid-outline"
                        size={20}
                        color={activeTab === 'posts' ? Theme.colors.font : Theme.colors.secondary}
                    />
                    <Text style={[styles.tabLabel, activeTab === 'posts' && styles.tabLabelActive]}>Posts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'stats' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('stats')}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name="chart-bar"
                        size={20}
                        color={activeTab === 'stats' ? Theme.colors.font : Theme.colors.secondary}
                    />
                    <Text style={[styles.tabLabel, activeTab === 'stats' && styles.tabLabelActive]}>Stats</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'stats' && (
                <View style={styles.statsSection}>
                    {countsLoading ? (
                        <ActivityIndicator size="large" color={Theme.colors.font} style={styles.statsLoading} />
                    ) : (
                        <>
                            <View style={styles.statTileRow}>
                                <View style={styles.statTile}>
                                    <CounterComponent targetValue={workoutCounts?.weekly.length ?? 0} style={styles.statTileValue} />
                                    <Text style={styles.statTileLabel}>This Week</Text>
                                </View>
                                <View style={styles.statTile}>
                                    <CounterComponent targetValue={workoutCounts?.lifetime.length ?? 0} style={styles.statTileValue} />
                                    <Text style={styles.statTileLabel}>Lifetime</Text>
                                </View>
                            </View>

                            <View style={styles.trendCard}>
                                <Text style={styles.trendTitle}>5 Week Trend</Text>
                                <View style={styles.trendChart}>
                                    <BarGraph data={trend.y} labels={trend.x.map(String)} />
                                </View>
                            </View>
                        </>
                    )}
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={activeTab === 'posts' ? posts : []}
                keyExtractor={item => item.id}
                renderItem={({ item, index }) => (
                    <View style={[styles.postItemWrap, index === 0 && styles.postItemFirst]}>
                        <PostCard
                            post={item}
                            onLikeToggle={handleLikeToggle}
                            onOptions={setOptionsPost}
                            currentUserId={user?.id ?? ''}
                        />
                    </View>
                )}
                contentContainerStyle={styles.scrollContent}
                ListHeaderComponent={listHeader}
                onEndReached={activeTab === 'posts' ? loadMorePosts : undefined}
                onEndReachedThreshold={0.4}
                ListFooterComponent={activeTab === 'posts' && loadingMorePosts ? (
                    <ActivityIndicator color={Theme.colors.secondary} style={styles.postsFooter} />
                ) : null}
                ListEmptyComponent={activeTab === 'posts' ? (
                    postsLoading ? (
                        <ActivityIndicator size="small" color={Theme.colors.secondary} style={styles.postsLoading} />
                    ) : (
                        <View style={styles.postsEmpty}>
                            <MaterialCommunityIcons name="image-off-outline" size={48} color={Theme.colors.secondary} />
                            <Text style={styles.postsEmptyText}>No posts yet</Text>
                        </View>
                    )
                ) : null}
            />

            <PostOwnerActions
                post={optionsPost}
                onClose={() => setOptionsPost(null)}
                onDeleted={handlePostDeleted}
                onUpdated={handlePostUpdated}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    scrollContent: {
        paddingBottom: Theme.spacing.xl,
        flexGrow: 1,
    },
    headerWrap: {
        alignItems: 'center',
        paddingTop: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
    },
    topActions: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: Theme.spacing.sm,
    },
    postItemWrap: {
        paddingHorizontal: Theme.spacing.md,
    },
    /** Lifts the first card off the tab row's divider, matching statsSection. */
    postItemFirst: {
        paddingTop: Theme.spacing.md,
    },
    editForm: {
        width: '100%',
        gap: Theme.spacing.sm,
        marginBottom: Theme.spacing.lg,
    },
    inputLabel: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.medium,
        marginLeft: Theme.spacing.xs,
    },
    input: {
        backgroundColor: Theme.colors.surface,
        color: Theme.colors.font,
        borderRadius: Theme.borderRadius.md,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.md,
        fontSize: Theme.fontSize.md,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    bioInput: {
        height: 90,
        textAlignVertical: 'top',
    },
    handleInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        paddingHorizontal: Theme.spacing.md,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    handlePrefix: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
    },
    handleInput: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        paddingVertical: Theme.spacing.md,
        paddingLeft: 2,
    },
    handleError: {
        color: Theme.colors.danger,
        fontSize: Theme.fontSize.xs,
        marginLeft: Theme.spacing.xs,
    },
    handleHint: {
        color: Theme.colors.textMuted,
        fontSize: Theme.fontSize.xs,
        marginLeft: Theme.spacing.xs,
    },
    editProfileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.surface,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.xl,
        borderRadius: Theme.borderRadius.lg,
        width: '100%',
    },
    editProfileBtnText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    editActionsRow: {
        flexDirection: 'row',
        gap: Theme.spacing.sm,
        width: '100%',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.lg,
    },
    cancelBtn: {
        backgroundColor: Theme.colors.surface,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    cancelBtnText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    saveBtn: {
        backgroundColor: Theme.colors.yellow,
        ...Theme.shadows.small,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveBtnText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
    tabRow: {
        flexDirection: 'row',
        width: '100%',
        marginTop: Theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.divider,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabBtnActive: {
        borderBottomColor: Theme.colors.yellow,
    },
    tabLabel: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    tabLabelActive: {
        color: Theme.colors.font,
    },
    statsSection: {
        width: '100%',
        paddingTop: Theme.spacing.md,
    },
    statsLoading: {
        marginTop: Theme.spacing.xl,
    },
    statTileRow: {
        flexDirection: 'row',
        gap: Theme.spacing.md,
        width: '100%',
    },
    statTile: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        paddingVertical: Theme.spacing.lg,
        ...Theme.shadows.small,
    },
    statTileValue: {
        color: Theme.colors.yellow,
        fontSize: Theme.fontSize.xxxl,
        fontWeight: Theme.fontWeight.bold,
    },
    statTileLabel: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.medium,
        marginTop: Theme.spacing.xs,
    },
    trendCard: {
        width: '100%',
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginTop: Theme.spacing.md,
        ...Theme.shadows.small,
    },
    trendTitle: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
        marginBottom: Theme.spacing.sm,
    },
    trendChart: {
        height: 160,
    },
    postsFooter: {
        paddingVertical: Theme.spacing.lg,
    },
    postsLoading: {
        marginTop: Theme.spacing.xl,
    },
    postsEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xl,
        paddingHorizontal: Theme.spacing.md,
        gap: Theme.spacing.sm,
    },
    postsEmptyText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
    },
});
