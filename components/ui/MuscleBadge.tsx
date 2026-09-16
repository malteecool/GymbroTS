import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { MuscleGroup, muscleGroupIcon, muscleGroupLabel } from '../../constants/MuscleGroups';

interface MuscleBadgeProps {
    group: MuscleGroup | null | undefined;
    /** Makes the badge tappable - used where the group can be reassigned. */
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

/**
 * The pill that marks which muscle an exercise trains. Renders as
 * "Uncategorised" rather than disappearing when no group is set, so an exercise
 * missing a group is visible instead of silently untagged.
 */
export function MuscleBadge({ group, onPress, style }: MuscleBadgeProps) {
    const content = (
        <>
            <MaterialCommunityIcons
                name={muscleGroupIcon(group)}
                size={14}
                color={group ? Theme.colors.green : Theme.colors.textMuted}
            />
            <Text style={[styles.label, !group && styles.labelMuted]} numberOfLines={1}>
                {muscleGroupLabel(group)}
            </Text>
            {onPress && (
                <MaterialCommunityIcons
                    name="pencil"
                    size={12}
                    color={Theme.colors.textMuted}
                />
            )}
        </>
    );

    return onPress ? (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.badge, !group && styles.badgeMuted, style]}
        >
            {content}
        </TouchableOpacity>
    ) : (
        <View style={[styles.badge, !group && styles.badgeMuted, style]}>{content}</View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Theme.spacing.xs,
        backgroundColor: Theme.colors.successSoft,
        borderRadius: Theme.borderRadius.round,
        paddingHorizontal: Theme.spacing.sm,
        paddingVertical: Theme.spacing.xs,
    },
    badgeMuted: {
        backgroundColor: Theme.colors.neutralSoft,
    },
    label: {
        ...Theme.typography.meta,
        fontSize: Theme.fontSize.xs,
        color: Theme.colors.textPrimary,
        fontWeight: Theme.fontWeight.semibold,
    },
    labelMuted: {
        color: Theme.colors.textMuted,
        fontWeight: Theme.fontWeight.normal,
    },
});
