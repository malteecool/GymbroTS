import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert, BackHandler,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { PostType } from '../../interfaces/Post.Interface';
import { createPost } from '../../services/PostService.Service';
import { getStordUserData } from '../../services/UserService.Service';
import { pickImage, uploadPostPhoto } from '../../services/ImageUploadService.Service';
import { useImagePickerHost } from '../../providers/ImagePickerHostProvider';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface SharePromptProps {
    visible: boolean;
    /** Sheet heading, e.g. "Workout Complete!" or "New PR!". */
    title: string;
    /** The thing being shared, called out under the heading. */
    highlight: string;
    icon: IconName;
    iconColor?: string;
    postType: PostType;
    workoutId: string | null;
    /** Pre-fills the caption field; the user can still edit or clear it. */
    initialCaption?: string;
    onClose: () => void;
    onShared: () => void;
}

/**
 * The bottom sheet that asks whether an achievement should go to the feed.
 *
 * Nothing is ever posted without an explicit tap on Share — skipping (or the
 * hardware back button) closes without writing anything.
 */
export function SharePrompt({
    visible, title, highlight, icon, iconColor = Theme.colors.green,
    postType, workoutId, initialCaption = '', onClose, onShared,
}: SharePromptProps) {
    const [caption, setCaption] = useState(initialCaption);
    const [sharing, setSharing] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const { requestImageSource } = useImagePickerHost();

    // Each time the sheet opens it may be describing a different achievement.
    useEffect(() => {
        if (visible) {
            setCaption(initialCaption);
            setPhotoUri(null);
        }
    }, [visible, initialCaption]);

    const handlePickPhoto = async () => {
        try {
            const source = await requestImageSource();
            if (!source) return;
            const uri = await pickImage(source);
            if (uri) setPhotoUri(uri);
        } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not pick a photo. Please try again.');
        }
    };

    const handleShare = async () => {
        try {
            setSharing(true);
            let imageUrl: string | undefined;
            if (photoUri) {
                const user = await getStordUserData();
                if (user) {
                    imageUrl = await uploadPostPhoto(user.id, photoUri);
                }
            }
            await createPost({ workoutId, postType, caption: caption.trim() || undefined, imageUrl });
            setCaption('');
            setPhotoUri(null);
            onShared();
        } catch (e) {
            console.error('Error sharing post:', e);
            Alert.alert('Error', 'Could not share to your feed. Please try again.');
        } finally {
            setSharing(false);
        }
    };

    const handleSkip = () => {
        setCaption('');
        setPhotoUri(null);
        onClose();
    };

    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            handleSkip();
            return true;
        });
        return () => sub.remove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={styles.root} pointerEvents="box-none">
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.headerRow}>
                        <MaterialCommunityIcons name={icon} size={28} color={iconColor} />
                        <Text style={styles.title}>{title}</Text>
                    </View>

                    <Text style={styles.highlight}>{highlight}</Text>
                    <Text style={styles.subtitle}>Share this to your feed?</Text>

                    <TextInput
                        style={styles.input}
                        value={caption}
                        onChangeText={setCaption}
                        placeholder="Add a caption (optional)..."
                        placeholderTextColor={Theme.colors.placeholder}
                        multiline
                        maxLength={200}
                    />

                    {photoUri ? (
                        <View style={styles.photoPreviewWrap}>
                            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                            <TouchableOpacity
                                style={styles.photoRemoveBtn}
                                onPress={() => setPhotoUri(null)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <MaterialCommunityIcons name="close-circle" size={22} color={Theme.colors.font} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.addPhotoBtn}
                            onPress={handlePickPhoto}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="camera-plus-outline" size={20} color={Theme.colors.secondary} />
                            <Text style={styles.addPhotoText}>Add Photo</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.8}>
                            <Text style={styles.skipBtnText}>Skip</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
                            onPress={handleShare}
                            disabled={sharing}
                            activeOpacity={0.8}
                        >
                            {sharing ? (
                                <ActivityIndicator size="small" color={Theme.colors.textOnAccent} />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="send" size={18} color={Theme.colors.textOnAccent} />
                                    <Text style={styles.shareBtnText}>Share</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFill,
        zIndex: 500,
        elevation: 500,
    },
    overlay: {
        flex: 1,
        backgroundColor: Theme.colors.overlay,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Theme.colors.surface,
        borderTopLeftRadius: Theme.borderRadius.xl,
        borderTopRightRadius: Theme.borderRadius.xl,
        padding: Theme.spacing.lg,
        paddingBottom: Theme.spacing.xl,
        gap: Theme.spacing.sm,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        marginBottom: Theme.spacing.xs,
    },
    title: {
        ...Theme.typography.screenTitle,
        flexShrink: 1,
    },
    highlight: {
        color: Theme.colors.accent,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.semibold,
    },
    subtitle: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
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
        height: 80,
        textAlignVertical: 'top',
    },
    addPhotoBtn: {
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
    addPhotoText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
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
    actions: {
        flexDirection: 'row',
        gap: Theme.spacing.sm,
        marginTop: Theme.spacing.sm,
    },
    skipBtn: {
        flex: 1,
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    skipBtnText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
    },
    shareBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.sm,
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.accent,
        ...Theme.shadows.small,
    },
    shareBtnDisabled: {
        opacity: 0.6,
    },
    shareBtnText: {
        color: Theme.colors.textOnAccent,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
});
