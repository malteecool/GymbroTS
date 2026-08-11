import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Comment } from '../../interfaces/Comment.Interface';
import { getComments, addComment, deleteComment } from '../../services/CommentService.Service';

interface CommentSectionProps {
    postId: string;
    currentUserId: string;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
}

export function CommentSection({ postId, currentUserId }: CommentSectionProps) {
    const router = useRouter();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getComments(postId);
            setComments(data);
        } catch (e) {
            console.error('Error loading comments:', e);
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => { load(); }, [load]);

    const handleSend = useCallback(async () => {
        const body = text.trim();
        if (!body || submitting) return;
        try {
            setSubmitting(true);
            const created = await addComment(postId, body);
            setComments(prev => [...prev, created]);
            setText('');
        } catch {
            Alert.alert('Error', 'Could not post comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }, [postId, text, submitting]);

    const handleDelete = useCallback((comment: Comment) => {
        Alert.alert('Delete comment', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deleteComment(comment.id);
                        setComments(prev => prev.filter(c => c.id !== comment.id));
                    } catch {
                        Alert.alert('Error', 'Could not delete comment. Please try again.');
                    }
                }
            },
        ]);
    }, []);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {loading ? (
                <ActivityIndicator color={Theme.colors.secondary} style={styles.loading} />
            ) : (
                <FlatList
                    data={comments}
                    keyExtractor={item => item.id}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.commentRow}>
                            <TouchableOpacity
                                style={styles.avatar}
                                onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: item.userId } })}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="account" size={18} color={Theme.colors.dark} />
                            </TouchableOpacity>
                            <View style={styles.commentBody}>
                                <View style={styles.commentHeader}>
                                    <Text style={styles.commentAuthor}>{item.authorName}</Text>
                                    <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
                                </View>
                                <Text style={styles.commentText}>{item.body}</Text>
                            </View>
                            {item.userId === currentUserId && (
                                <TouchableOpacity
                                    onPress={() => handleDelete(item)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <MaterialCommunityIcons name="close" size={16} color={Theme.colors.secondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="comment-outline" size={40} color={Theme.colors.secondary} />
                            <Text style={styles.emptyText}>No comments yet</Text>
                        </View>
                    }
                />
            )}

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a comment..."
                    placeholderTextColor={Theme.colors.placeholder}
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!text.trim() || submitting) && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!text.trim() || submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color={Theme.colors.dark} />
                    ) : (
                        <MaterialCommunityIcons name="send" size={18} color={Theme.colors.dark} />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loading: {
        marginTop: Theme.spacing.lg,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: Theme.spacing.md,
        paddingBottom: Theme.spacing.md,
        flexGrow: 1,
    },
    commentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Theme.spacing.sm,
        marginBottom: Theme.spacing.md,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Theme.colors.yellow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    commentBody: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    commentAuthor: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    commentTime: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
    },
    commentText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        lineHeight: Theme.lineHeight.sm,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xl,
        gap: Theme.spacing.sm,
    },
    emptyText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Theme.spacing.sm,
        padding: Theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
        backgroundColor: Theme.colors.dark,
    },
    input: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        maxHeight: 100,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Theme.colors.yellow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});
