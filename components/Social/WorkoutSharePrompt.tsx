import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { createPost } from '../../services/PostService.Service';

interface WorkoutSharePromptProps {
    visible: boolean;
    workoutName: string;
    workoutId: string;
    onClose: () => void;
    onShared: () => void;
}

export function WorkoutSharePrompt({ visible, workoutName, workoutId, onClose, onShared }: WorkoutSharePromptProps) {
    const [caption, setCaption] = useState('');
    const [sharing, setSharing] = useState(false);

    const handleShare = async () => {
        try {
            setSharing(true);
            await createPost({ workoutId, postType: 'workout_complete', caption: caption.trim() || undefined });
            setCaption('');
            onShared();
        } catch (e) {
            console.error('Error sharing post:', e);
        } finally {
            setSharing(false);
        }
    };

    const handleSkip = () => {
        setCaption('');
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleSkip}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.headerRow}>
                        <MaterialCommunityIcons name="check-circle" size={28} color={Theme.colors.green} />
                        <Text style={styles.title}>Workout Complete!</Text>
                    </View>

                    <Text style={styles.workoutName}>{workoutName}</Text>
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
                                <ActivityIndicator size="small" color={Theme.colors.dark} />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="send" size={18} color={Theme.colors.dark} />
                                    <Text style={styles.shareBtnText}>Share</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Theme.colors.lessDark,
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
        color: Theme.colors.font,
        fontSize: Theme.fontSize.xl,
        fontWeight: Theme.fontWeight.bold,
    },
    workoutName: {
        color: Theme.colors.yellow,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.semibold,
    },
    subtitle: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        marginBottom: Theme.spacing.xs,
    },
    input: {
        backgroundColor: Theme.colors.dark,
        color: Theme.colors.font,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.md,
        fontSize: Theme.fontSize.md,
        height: 80,
        textAlignVertical: 'top',
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
        borderColor: Theme.colors.border,
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
        backgroundColor: Theme.colors.yellow,
        ...Theme.shadows.small,
    },
    shareBtnDisabled: {
        opacity: 0.6,
    },
    shareBtnText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
});
