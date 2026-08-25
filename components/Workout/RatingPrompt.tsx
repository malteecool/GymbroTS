import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { StarRating } from '../ui/StarRating';

interface RatingPromptProps {
    visible: boolean;
    workoutName: string;
    onSubmit: (rating: number) => Promise<void> | void;
    onSkip: () => void;
}

export function RatingPrompt({ visible, workoutName, onSubmit, onSkip }: RatingPromptProps) {
    const [rating, setRating] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) return;
        try {
            setSubmitting(true);
            await onSubmit(rating);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onSkip}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.headerRow}>
                        <MaterialCommunityIcons name="star-outline" size={28} color={Theme.colors.accent} />
                        <Text style={styles.title}>Rate this workout</Text>
                    </View>

                    <Text style={styles.workoutName}>{workoutName}</Text>
                    <Text style={styles.subtitle}>How was it? Your rating helps others find good workouts.</Text>

                    <View style={styles.starsRow}>
                        <StarRating rating={rating} size={36} onChange={setRating} />
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.8}>
                            <Text style={styles.skipBtnText}>Skip</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={rating === 0 || submitting}
                            activeOpacity={0.8}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color={Theme.colors.dark} />
                            ) : (
                                <Text style={styles.submitBtnText}>Submit</Text>
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
    starsRow: {
        alignItems: 'center',
        paddingVertical: Theme.spacing.md,
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
    submitBtn: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.yellow,
        ...Theme.shadows.small,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
});
