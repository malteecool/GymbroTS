import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Post } from '../../interfaces/Post.Interface';
import { deletePost } from '../../services/PostService.Service';
import { ActionSheet, ActionSheetOption } from '../ui/ActionSheet';
import { PostEditSheet } from './PostEditSheet';

/** What to do once the menu has finished sliding away. */
type PendingAction = { kind: 'edit' | 'delete'; post: Post };

interface PostOwnerActionsProps {
    /** The post whose menu is open, or null when nothing is open. */
    post: Post | null;
    onClose: () => void;
    /** Called once the post is gone from the server. */
    onDeleted: (postId: string) => void;
    /** Called with the saved post after an edit. */
    onUpdated: (post: Post) => void;
}

/**
 * The Edit / Delete menu behind the dots on a post you own, plus the edit sheet
 * it opens and the confirmation that guards the delete.
 *
 * Mounted once per screen rather than per card: these are full-screen overlays,
 * and inside a list cell they would be positioned against the cell.
 */
export function PostOwnerActions({ post, onClose, onDeleted, onUpdated }: PostOwnerActionsProps) {
    // Picking an option closes the menu and parks the choice here, so the next
    // overlay opens against a clear screen rather than crossing the menu on its
    // way out. Both hold their own copy of the post, since the caller clears
    // `post` the moment the menu closes.
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [editing, setEditing] = useState<Post | null>(null);

    const confirmDelete = (target: Post) => {
        Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deletePost(target.id);
                        onDeleted(target.id);
                    } catch (e) {
                        console.error('Error deleting post:', e);
                        Alert.alert('Error', 'Could not delete post. Please try again.');
                    }
                },
            },
        ]);
    };

    const choose = (kind: PendingAction['kind']) => {
        if (!post) return;
        setPending({ kind, post });
        onClose();
    };

    const runPending = () => {
        if (!pending) return;
        if (pending.kind === 'edit') {
            setEditing(pending.post);
        } else {
            confirmDelete(pending.post);
        }
        setPending(null);
    };

    const options: ActionSheetOption[] = [
        {
            label: 'Edit post',
            icon: 'pencil-outline',
            onPress: () => choose('edit'),
        },
        {
            label: 'Delete post',
            icon: 'trash-can-outline',
            destructive: true,
            onPress: () => choose('delete'),
        },
    ];

    return (
        <>
            <ActionSheet
                visible={!!post}
                options={options}
                onCancel={onClose}
                onClosed={runPending}
            />
            <PostEditSheet
                post={editing}
                onCancel={() => setEditing(null)}
                onSaved={saved => { setEditing(null); onUpdated(saved); }}
            />
        </>
    );
}
