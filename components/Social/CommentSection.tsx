import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
    ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Comment, CommentSort, CommentThread } from '../../interfaces/Comment.Interface';
import {
    getComments, addComment, deleteComment, countComments, sortCommentThreads,
    likeComment, unlikeComment,
} from '../../services/CommentService.Service';
import { Avatar } from '../ui/Avatar';
import { SegmentedTabs } from '../ui/SegmentedTabs';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import emitter from '../../hooks/CustomEventEmitter';
import { POST_COMMENT_COUNT_EVENT } from '../../interfaces/Post.Interface';

interface CommentSectionProps {
    postId: string;
    currentUserId: string;
    /** Reports the live comment count so the post card above can stay in sync. */
    onCountChange?: (count: number) => void;
    /**
     * Rendered above the first comment and scrolls with the list - the post
     * card goes here. Pinning it above the list instead would leave a post with
     * a photo no room at all for the composer once the keyboard is up.
     */
    headerComponent?: React.ReactNode;
}

/** Who the composer is answering. `id` is always the top-level comment. */
interface ReplyTarget {
    id: string;
    authorName: string;
}

const SORT_OPTIONS: { value: CommentSort; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'top', label: 'Most liked' },
];

/**
 * Replaces one comment wherever it sits - a thread root or a reply - leaving
 * the rest of the tree untouched.
 */
function updateComment(
    threads: CommentThread[],
    commentId: string,
    patch: (comment: Comment) => Comment,
): CommentThread[] {
    return threads.map(thread => {
        if (thread.id === commentId) {
            // Spread order keeps `replies`, which `patch` does not know about.
            return { ...thread, ...patch(thread) };
        }
        if (!thread.replies.some(reply => reply.id === commentId)) return thread;
        return {
            ...thread,
            replies: thread.replies.map(reply => (reply.id === commentId ? patch(reply) : reply)),
        };
    });
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

interface CommentRowProps {
    comment: Comment;
    currentUserId: string;
    onReply: () => void;
    onDelete: () => void;
    onPressAuthor: () => void;
    onLikeToggle: () => void;
    /** Replies render smaller, so a thread reads as subordinate to its parent. */
    isReply?: boolean;
}

function CommentRow({ comment, currentUserId, onReply, onDelete, onPressAuthor, onLikeToggle, isReply }: CommentRowProps) {
    return (
        <View style={styles.commentRow}>
            <TouchableOpacity onPress={onPressAuthor} activeOpacity={0.7}>
                <Avatar uri={comment.authorAvatarUrl} size={isReply ? 26 : 32} />
            </TouchableOpacity>
            <View style={styles.commentBody}>
                <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                    <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{comment.body}</Text>
                <View style={styles.commentActions}>
                    <TouchableOpacity
                        onPress={onReply}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                        <Text style={styles.commentActionText}>Reply</Text>
                    </TouchableOpacity>
                    {comment.likeCount > 0 && (
                        <Text style={styles.commentActionText}>
                            {comment.likeCount} {comment.likeCount === 1 ? 'like' : 'likes'}
                        </Text>
                    )}
                </View>
            </View>
            <View style={styles.rowEnd}>
                <TouchableOpacity
                    onPress={onLikeToggle}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons
                        name={comment.likedByMe ? 'heart' : 'heart-outline'}
                        size={16}
                        color={comment.likedByMe ? Theme.colors.danger : Theme.colors.secondary}
                    />
                </TouchableOpacity>
                {comment.userId === currentUserId && (
                    <TouchableOpacity
                        onPress={onDelete}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons name="close" size={16} color={Theme.colors.secondary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

export function CommentSection({ postId, currentUserId, onCountChange, headerComponent }: CommentSectionProps) {
    const router = useRouter();
    const [threads, setThreads] = useState<CommentThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [sort, setSort] = useState<CommentSort>('newest');

    const inputRef = useRef<TextInput>(null);
    const keyboardInset = useKeyboardInset();

    // Held in a ref so `load` stays stable even when a caller passes an inline
    // arrow, which would otherwise re-trigger the fetch effect every render.
    const onCountChangeRef = useRef(onCountChange);
    useEffect(() => { onCountChangeRef.current = onCountChange; }, [onCountChange]);

    // Tells the parent card directly, and any other mounted screen showing this
    // post (feed, profile timeline) over the app event bus.
    const publishCount = useCallback((count: number, broadcast: boolean) => {
        onCountChangeRef.current?.(count);
        if (broadcast) {
            emitter.emit(POST_COMMENT_COUNT_EVENT, { postId, commentCount: count });
        }
    }, [postId]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getComments(postId);
            setThreads(data);
            publishCount(countComments(data), false);
        } catch (e) {
            console.error('Error loading comments:', e);
        } finally {
            setLoading(false);
        }
    }, [postId, publishCount]);

    useEffect(() => { load(); }, [load]);

    const startReply = useCallback((threadId: string, authorName: string) => {
        setReplyTarget({ id: threadId, authorName });
        inputRef.current?.focus();
    }, []);

    const toggleThread = useCallback((threadId: string) => {
        setExpandedThreads(prev => {
            const next = new Set(prev);
            if (next.has(threadId)) {
                next.delete(threadId);
            } else {
                next.add(threadId);
            }
            return next;
        });
    }, []);

    const handleLikeToggle = useCallback(async (comment: Comment) => {
        const liked = !comment.likedByMe;
        setThreads(prev => updateComment(prev, comment.id, c => ({
            ...c,
            likedByMe: liked,
            likeCount: c.likeCount + (liked ? 1 : -1),
        })));
        try {
            if (liked) {
                await likeComment(comment.id);
            } else {
                await unlikeComment(comment.id);
            }
        } catch {
            setThreads(prev => updateComment(prev, comment.id, c => ({
                ...c,
                likedByMe: comment.likedByMe,
                likeCount: comment.likeCount,
            })));
        }
    }, []);

    const handleSend = useCallback(async () => {
        const body = text.trim();
        if (!body || submitting) return;
        const parentId = replyTarget?.id ?? null;
        try {
            setSubmitting(true);
            const created = await addComment(postId, body, parentId);
            setThreads(prev => {
                const next = parentId
                    ? prev.map(thread => (thread.id === parentId
                        ? { ...thread, replies: [...thread.replies, created] }
                        : thread))
                    : [...prev, { ...created, replies: [] }];
                publishCount(countComments(next), true);
                return next;
            });
            // A reply the sender cannot see would read as a failed send, so open
            // the thread it landed in.
            if (parentId) {
                setExpandedThreads(prev => new Set(prev).add(parentId));
            }
            setText('');
            setReplyTarget(null);
        } catch {
            Alert.alert('Error', 'Could not post comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }, [postId, text, submitting, replyTarget, publishCount]);

    const handleDelete = useCallback((comment: Comment) => {
        Alert.alert('Delete comment', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deleteComment(comment.id);
                        setThreads(prev => {
                            // Deleting a top-level comment cascades to its replies
                            // in the database, so drop the whole group here too.
                            const isThread = prev.some(thread => thread.id === comment.id);
                            const next = isThread
                                ? prev.filter(thread => thread.id !== comment.id)
                                : prev.map(thread => ({
                                    ...thread,
                                    replies: thread.replies.filter(reply => reply.id !== comment.id),
                                }));
                            publishCount(countComments(next), true);
                            return next;
                        });
                        setReplyTarget(prev => (prev?.id === comment.id ? null : prev));
                    } catch {
                        Alert.alert('Error', 'Could not delete comment. Please try again.');
                    }
                }
            },
        ]);
    }, [publishCount]);

    const openProfile = useCallback((userId: string) => {
        router.push({ pathname: '/profile/[userId]', params: { userId } });
    }, [router]);

    // Sorting the rendered copy rather than `threads` keeps insert and delete
    // working against one stable list whatever order is on screen.
    const visibleThreads = useMemo(
        () => sortCommentThreads(threads, sort),
        [threads, sort],
    );

    const renderThread = useCallback(({ item }: { item: CommentThread }) => {
        const expanded = expandedThreads.has(item.id);
        const replyCount = item.replies.length;

        return (
            <View style={styles.thread}>
                <CommentRow
                    comment={item}
                    currentUserId={currentUserId}
                    onReply={() => startReply(item.id, item.authorName)}
                    onDelete={() => handleDelete(item)}
                    onPressAuthor={() => openProfile(item.userId)}
                    onLikeToggle={() => handleLikeToggle(item)}
                />

                {replyCount > 0 && (
                    <View style={styles.replySection}>
                        {/* Kept above the replies rather than below them, so the
                            control does not move to the far end of a long thread
                            the moment it is opened. */}
                        <TouchableOpacity
                            onPress={() => toggleThread(item.id)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            style={styles.threadToggle}
                        >
                            <MaterialCommunityIcons
                                name={expanded ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color={Theme.colors.secondary}
                            />
                            <Text style={styles.threadToggleText}>
                                {expanded
                                    ? 'Hide replies'
                                    : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
                            </Text>
                        </TouchableOpacity>

                        {expanded && (
                            <View style={styles.replies}>
                                <View style={styles.replyRail} />
                                <View style={styles.replyList}>
                                    {item.replies.map(reply => (
                                        <CommentRow
                                            key={reply.id}
                                            comment={reply}
                                            currentUserId={currentUserId}
                                            onReply={() => startReply(item.id, reply.authorName)}
                                            onDelete={() => handleDelete(reply)}
                                            onPressAuthor={() => openProfile(reply.userId)}
                                            onLikeToggle={() => handleLikeToggle(reply)}
                                            isReply
                                        />
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    }, [currentUserId, expandedThreads, handleDelete, handleLikeToggle, openProfile, startReply, toggleThread]);

    return (
        <View style={[styles.container, { paddingBottom: keyboardInset }]}>
            <FlatList
                data={loading ? [] : visibleThreads}
                keyExtractor={item => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                renderItem={renderThread}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                    <>
                        {headerComponent}
                        {!loading && threads.length > 1 && (
                            <SegmentedTabs
                                options={SORT_OPTIONS}
                                value={sort}
                                onChange={setSort}
                                style={styles.sortRow}
                            />
                        )}
                    </>
                }
                ListEmptyComponent={loading ? (
                    <ActivityIndicator color={Theme.colors.secondary} style={styles.loading} />
                ) : (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="comment-outline" size={40} color={Theme.colors.secondary} />
                        <Text style={styles.emptyText}>No comments yet</Text>
                    </View>
                )}
            />

            <View style={styles.composer}>
                {replyTarget && (
                    <View style={styles.replyBanner}>
                        <MaterialCommunityIcons name="reply" size={14} color={Theme.colors.secondary} />
                        <Text style={styles.replyBannerText} numberOfLines={1}>
                            Replying to {replyTarget.authorName}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setReplyTarget(null)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <MaterialCommunityIcons name="close" size={14} color={Theme.colors.secondary} />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputRow}>
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder={replyTarget ? 'Write a reply...' : 'Add a comment...'}
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
            </View>
        </View>
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
        padding: Theme.spacing.md,
        flexGrow: 1,
    },
    thread: {
        marginBottom: Theme.spacing.md,
    },
    commentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Theme.spacing.sm,
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
    commentActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
        marginTop: Theme.spacing.xs,
    },
    commentActionText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
        fontWeight: Theme.fontWeight.semibold,
    },
    rowEnd: {
        alignItems: 'center',
        gap: Theme.spacing.sm,
        paddingTop: 2,
    },
    sortRow: {
        paddingBottom: Theme.spacing.md,
    },
    replySection: {
        // Lines the toggle and the rail up under the middle of the parent avatar.
        paddingLeft: 16,
        marginTop: Theme.spacing.xs,
    },
    replies: {
        flexDirection: 'row',
        marginTop: Theme.spacing.md,
    },
    replyRail: {
        width: 1,
        backgroundColor: Theme.colors.divider,
        marginRight: Theme.spacing.md,
    },
    replyList: {
        flex: 1,
        gap: Theme.spacing.md,
    },
    threadToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        alignSelf: 'flex-start',
        paddingVertical: Theme.spacing.xs,
    },
    threadToggleText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
        fontWeight: Theme.fontWeight.semibold,
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
    composer: {
        borderTopWidth: 1,
        borderTopColor: Theme.colors.divider,
        backgroundColor: Theme.colors.background,
    },
    replyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.md,
        paddingTop: Theme.spacing.sm,
    },
    replyBannerText: {
        flex: 1,
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Theme.spacing.sm,
        padding: Theme.spacing.md,
    },
    input: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        backgroundColor: Theme.colors.surface,
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
