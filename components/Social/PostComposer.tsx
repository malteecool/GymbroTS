import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Post } from '../../interfaces/Post.Interface';
import { createPost } from '../../services/PostService.Service';
import { getStordUserData } from '../../services/UserService.Service';
import { pickImage, uploadPostPhoto } from '../../services/ImageUploadService.Service';
import { useImagePickerHost } from '../../providers/ImagePickerHostProvider';
import { Avatar } from '../ui/Avatar';

const MAX_LENGTH = 500;
/** The counter only earns its space once the limit is actually in sight. */
const COUNTER_VISIBLE_FROM = MAX_LENGTH - 100;

interface PostComposerProps {
    /** The signed-in user's avatar, so the card reads as "you are posting". */
    avatarUrl?: string | null;
    /** Handed the created post so the feed can show it without refetching. */
    onPosted: (post: Post) => void;
}

/**
 * The placeholder card at the top of the feed that opens into a post editor.
 *
 * Collapsed it is a single placeholder row; tapping it reveals the input and
 * the actions. Posts written here have no workout behind them, so they go out
 * as `text` posts and their cards render without an activity label.
 */
export function PostComposer({ avatarUrl, onPosted }: PostComposerProps) {
    const [expanded, setExpanded] = useState(false);
    const [caption, setCaption] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const { requestImageSource } = useImagePickerHost();

    const trimmed = caption.trim();
    const canPost = (trimmed.length > 0 || !!photoUri) && !posting;

    const reset = () => {
        setExpanded(false);
        setCaption('');
        setPhotoUri(null);
    };

    const handlePickPhoto = async () => {
        // The picker sheet slides up from the bottom, so get the keyboard out
        // of its way first.
        Keyboard.dismiss();
        setExpanded(true);
        try {
            const source = await requestImageSource();
            if (!source) return;
            const uri = await pickImage(source);
            if (uri) setPhotoUri(uri);
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not pick a photo. Please try again.');
        }
    };

    const handlePost = async () => {
        if (!canPost) return;
        try {
            setPosting(true);
            let imageUrl: string | undefined;
            if (photoUri) {
                const user = await getStordUserData();
                if (user) {
                    imageUrl = await uploadPostPhoto(user.id, photoUri);
                }
            }
            const post = await createPost({
                workoutId: null,
                postType: 'text',
                caption: trimmed || undefined,
                imageUrl,
            });
            Keyboard.dismiss();
            reset();
            onPosted(post);
        } catch (e) {
            console.error('Error creating post:', e);
            Alert.alert('Error', 'Could not share your post. Please try again.');
        } finally {
            setPosting(false);
        }
    };

    const handleCancel = () => {
        Keyboard.dismiss();
        reset();
    };

    if (!expanded) {
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => setExpanded(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Write a post"
            >
                <View style={styles.collapsedRow}>
                    <Avatar uri={avatarUrl} size={40} />
                    <Text style={styles.placeholder}>Something new to share?</Text>
                    <TouchableOpacity
                        onPress={handlePickPhoto}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Add a photo to a new post"
                    >
                        <MaterialCommunityIcons
                            name="image-plus"
                            size={22}
                            color={Theme.colors.secondary}
                        />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.editorRow}>
                <Avatar uri={avatarUrl} size={40} />
                <TextInput
                    style={styles.input}
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="Something new to share?"
                    placeholderTextColor={Theme.colors.placeholder}
                    multiline
                    maxLength={MAX_LENGTH}
                    autoFocus
                    editable={!posting}
                />
            </View>

            {photoUri ? (
                <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <TouchableOpacity
                        style={styles.photoRemoveBtn}
                        onPress={() => setPhotoUri(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Remove photo"
                    >
                        <MaterialCommunityIcons name="close-circle" size={22} color={Theme.colors.font} />
                    </TouchableOpacity>
                </View>
            ) : null}

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.photoBtn}
                    onPress={handlePickPhoto}
                    disabled={posting}
                    activeOpacity={0.7}
                    accessibilityLabel="Add a photo"
                >
                    <MaterialCommunityIcons name="image-plus" size={20} color={Theme.colors.secondary} />
                    <Text style={styles.photoBtnText}>{photoUri ? 'Change' : 'Photo'}</Text>
                </TouchableOpacity>

                {caption.length >= COUNTER_VISIBLE_FROM && (
                    <Text style={styles.counter}>{MAX_LENGTH - caption.length}</Text>
                )}

                <View style={styles.actionsSpacer} />

                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                    disabled={posting}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
                    onPress={handlePost}
                    disabled={!canPost}
                    activeOpacity={0.8}
                >
                    {posting ? (
                        <ActivityIndicator size="small" color={Theme.colors.textOnAccent} />
                    ) : (
                        <Text style={styles.postBtnText}>Post</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
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
    collapsedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
    },
    placeholder: {
        flex: 1,
        color: Theme.colors.placeholder,
        fontSize: Theme.fontSize.md,
    },
    editorRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Theme.spacing.sm,
    },
    input: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        lineHeight: Theme.lineHeight.md,
        // Roughly two lines to start with, so the card grows into the text
        // rather than opening as a large empty box.
        minHeight: 44,
        maxHeight: 160,
        paddingTop: Theme.spacing.xs,
        paddingBottom: 0,
        textAlignVertical: 'top',
    },
    photoPreviewWrap: {
        position: 'relative',
        marginTop: Theme.spacing.sm,
    },
    photoPreview: {
        width: '100%',
        height: 160,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.background,
    },
    photoRemoveBtn: {
        position: 'absolute',
        top: Theme.spacing.xs,
        right: Theme.spacing.xs,
        backgroundColor: Theme.colors.overlay,
        borderRadius: Theme.borderRadius.round,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        marginTop: Theme.spacing.md,
        paddingTop: Theme.spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Theme.colors.divider,
    },
    actionsSpacer: {
        flex: 1,
    },
    photoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    photoBtnText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.medium,
    },
    counter: {
        color: Theme.colors.textMuted,
        fontSize: Theme.fontSize.xs,
    },
    cancelBtn: {
        paddingVertical: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.sm,
    },
    cancelBtnText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.medium,
    },
    postBtn: {
        minWidth: 76,
        paddingVertical: Theme.spacing.xs + 2,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.round,
        backgroundColor: Theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    postBtnDisabled: {
        opacity: 0.45,
    },
    postBtnText: {
        color: Theme.colors.textOnAccent,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.bold,
    },
});
