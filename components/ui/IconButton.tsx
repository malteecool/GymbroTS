import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconButtonProps {
    icon: IconName;
    onPress: () => void;
    accessibilityLabel: string;
    color?: string;
    size?: number;
    /** Count bubble drawn on the icon; nothing is rendered at zero. */
    badgeCount?: number;
    /** `filled` sits on a round surface chip, `plain` is the bare icon. */
    variant?: 'filled' | 'plain';
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
}

/**
 * Screen-level action affordance. The tabs carry no header bar, so each
 * screen places its own actions with this instead of `headerRight`.
 */
export function IconButton({
    icon,
    onPress,
    accessibilityLabel,
    color = Theme.colors.textPrimary,
    size = 22,
    badgeCount = 0,
    variant = 'filled',
    disabled,
    style,
}: IconButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[variant === 'filled' ? styles.filled : styles.plain, disabled && styles.disabled, style]}
        >
            <MaterialCommunityIcons name={icon} size={size} color={color} />
            {badgeCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    filled: {
        width: 38,
        height: 38,
        borderRadius: Theme.borderRadius.round,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.surface,
    },
    plain: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Theme.spacing.xs,
    },
    disabled: {
        opacity: 0.4,
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 3,
        backgroundColor: Theme.colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: Theme.colors.white,
        fontSize: 10,
        fontWeight: Theme.fontWeight.bold,
    },
});
