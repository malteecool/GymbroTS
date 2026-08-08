import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../../constants/Theme';
import { Post } from '../../../interfaces/Post.Interface';
import { getPostById, likePost, unlikePost, deletePost } from '../../../services/PostService.Service';
import { getStordUserData } from '../../../services/UserService.Service';
import { PostCard } from '../../../components/Social/PostCard';
import { CommentSection } from '../../../components/Social/CommentSection';

export default function PostDetailScreen() {
    const { postId } = useLocalSearchParams<{ postId: string }>();
    const router = useRouter();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState('');

    const load = useCallback(async () => {
        if (!postId) return;
        try {
            setLoading(true);
            const [p, user] = await Promise.all([getPostById(postId), getStordUserData()]);
            setPost(p);
            if (user) setCurrentUserId(user.id);
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

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Theme.colors.font} />
            </View>
        );
    }

    if (!post) {
        return (
            <View style={styles.centered}>
                <MaterialCommunityIcons name="alert-circle-outline" size={56} color={Theme.colors.secondary} />
                <Text style={styles.notFoundText}>Post not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.postWrapper}>
                <PostCard
                    post={post}
                    onLikeToggle={handleLikeToggle}
                    onDelete={handleDelete}
                    currentUserId={currentUserId}
                />
            </View>
            <CommentSection postId={post.id} currentUserId={currentUserId} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    postWrapper: {
        padding: Theme.spacing.md,
        paddingBottom: 0,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
        gap: Theme.spacing.md,
    },
    notFoundText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
    },
});
