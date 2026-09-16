import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Post } from '../../interfaces/Post.Interface';
import { updatePost } from '../../services/PostService.Service';
import { getStordUserData } from '../../services/UserService.Service';
import { pickImage, uploadPostPhoto } from '../../services/ImageUploadService.Service';
import { useImagePickerHost } from '../../providers/ImagePickerHostProvider';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { BottomSheet } from '../ui/BottomSheet';

const MAX_LENGTH = 500;

/**
 * The photo currently on the sheet. `remote` is the one already stored on the
 * post; `local` is one just picked and not uploaded yet - the distinction is
 * what decides whether saving has to hit Storage at all.
 */
type SheetPhoto = { uri: string; origin: 'remote' | 'local' };

interface PostEditSheetProps {
    /** The post being edited, or null when the sheet is closed. */
    post: Post | null;
    onCancel: () => void;
    /** Handed the saved post so the caller can swap it into whatever list it holds. */
    onSaved: (post: Post) => void;
}

/**
 * Bottom sheet for editing a post you own: its caption and its photo.
 *
 * Nothing is written until Save, and Save stays disabled until something has
 * actually changed, so opening the sheet to look and backing out is free.
 */
export function PostEditSheet({ post, onCancel, onSaved }: PostEditSheetProps) {
    // The sheet outlives `post` by the length of its closing slide, so the
    // subject is latched here - otherwise the content would blank out the
    // instant the caller cleared it and the sheet would slide away empty.
    const [subject, setSubject] = useState<Post | null>(post);
    const [caption, setCaption] = useState('');
    const [photo, setPhoto] = useState<SheetPhoto | null>(null);
    const [saving, setSaving] = useState(false);
    const { requestImageSource } = useImagePickerHost();
    const keyboardInset = useKeyboardInset();

    // Reset to the post's own content each time the sheet opens, so a cancelled
    // edit leaves nothing behind for the next one.
    useEffect(() => {
        if (!post) return;
        setSubject(post);
        setCaption(post.caption ?? '');
        setPhoto(post.imageUrl ? { uri: post.imageUrl, origin: 'remote' } : null);
    }, [post]);

    if (!subject) return null;

    const trimmed = caption.trim();
    const captionChanged = trimmed !== (subject.caption ?? '').trim();
    const photoChanged = (photo?.uri ?? null) !== (subject.imageUrl ?? null);
    // A text post is nothing but its caption and photo, so it cannot be emptied
    // out entirely. Activity posts still say something without either.
    const hasContent = subject.postType !== 'text' || trimmed.length > 0 || !!photo;
    const canSave = (captionChanged || photoChanged) && hasContent && !saving;

    const handlePickPhoto = async () => {
        try {
            const source = await requestImageSource();
            if (!source) return;
            const uri = await pickImage(source);
            if (uri) setPhoto({ uri, origin: 'local' });
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not pick a photo. Please try again.');
        }
    };

    const handleSave = async () => {
        if (!canSave) return;
        try {
            setSaving(true);

            let imageUrl: string | null = null;
            if (photo?.origin === 'local') {
                const user = await getStordUserData();
                imageUrl = user ? await uploadPostPhoto(user.id, photo.uri) : null;
            } else if (photo) {
                imageUrl = photo.uri;
            }

            const saved = await updatePost(subject.id, { caption: trimmed || null, imageUrl });
            onSaved(saved);
        } catch (e) {
            console.error('Error updating post:', e);
            Alert.alert('Error', 'Could not save your changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <BottomSheet
            visible={!!post}
            onRequestClose={onCancel}
            dismissible={!saving}
            contentStyle={{ paddingBottom: Theme.spacing.xl + keyboardInset }}
            // Below the shared image picker the photo button reaches for.
            zIndex={900}
        >
            <Text style={styles.title}>Edit post</Text>

            <TextInput
                style={styles.input}
                value={caption}
                onChangeText={setCaption}
                placeholder="Write something..."
                placeholderTextColor={Theme.colors.placeholder}
                multiline
                maxLength={MAX_LENGTH}
                autoFocus
                editable={!saving}
            />

            {photo ? (
                <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                    <TouchableOpacity
                        style={styles.photoRemoveBtn}
                        onPress={() => setPhoto(null)}
                        disabled={saving}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Remove photo"
                    >
                        <MaterialCommunityIcons name="close-circle" size={22} color={Theme.colors.font} />
                    </TouchableOpacity>
                </View>
            ) : null}

            <TouchableOpacity
                style={styles.photoBtn}
                onPress={handlePickPhoto}
                disabled={saving}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons
                    name={photo ? 'image-edit-outline' : 'camera-plus-outline'}
                    size={20}
                    color={Theme.colors.secondary}
                />
                <Text style={styles.photoBtnText}>{photo ? 'Change Photo' : 'Add Photo'}</Text>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onCancel}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={!canSave}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color={Theme.colors.textOnAccent} />
                    ) : (
                        <Text style={styles.saveBtnText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    title: {
        ...Theme.typography.screenTitle,
        marginBottom: Theme.spacing.xs,
    },
    input: {
        backgroundColor: Theme.colors.background,
        color: Theme.colors.font,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.md,
        fontSize: Theme.fontSize.md,
        height: 100,
        textAlignVertical: 'top',
    },
    photoPreviewWrap: {
        position: 'relative',
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
    photoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
        borderStyle: 'dashed',
    },
    photoBtnText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
    },
    actions: {
        flexDirection: 'row',
        gap: Theme.spacing.sm,
        marginTop: Theme.spacing.sm,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    cancelBtnText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
    },
    saveBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.accent,
        ...Theme.shadows.small,
    },
    saveBtnDisabled: {
        opacity: 0.45,
    },
    saveBtnText: {
        color: Theme.colors.textOnAccent,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
});
