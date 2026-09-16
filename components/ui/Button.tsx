import React, { ReactNode } from 'react';
import {
    ActivityIndicator, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Either a ready-made element, or a name the button renders itself. */
type ButtonIcon = ReactNode | { name: IconName; size?: number; color?: string };

interface ButtonProps {
    title?: string;
    onPress?: () => void;
    /** Sits to the left of the title, or alone when there is no title. */
    icon?: ButtonIcon;
    /** Swaps the title for a spinner. Does not disable on its own - pass both. */
    loading?: boolean;
    disabled?: boolean;
    /** The pressable itself: background, radius, padding. */
    buttonStyle?: StyleProp<ViewStyle>;
    /** Wraps the pressable, for margins and width the background should not take. */
    containerStyle?: StyleProp<ViewStyle>;
    titleStyle?: StyleProp<TextStyle>;
    /** Applied over buttonStyle while disabled. Defaults to dimming the button. */
    disabledStyle?: StyleProp<ViewStyle>;
    disabledTitleStyle?: StyleProp<TextStyle>;
    accessibilityLabel?: string;
}

function isIconSpec(icon: ButtonIcon): icon is { name: IconName; size?: number; color?: string } {
    return typeof icon === 'object' && icon !== null && 'name' in icon;
}

/**
 * The app's filled button.
 *
 * Callers own the look through `buttonStyle` / `titleStyle` - the defaults here
 * are only padding and centring, so a caller that sets just a background colour
 * still gets a sensible shape.
 */
export function Button({
    title,
    onPress,
    icon,
    loading = false,
    disabled = false,
    buttonStyle,
    containerStyle,
    titleStyle,
    disabledStyle,
    disabledTitleStyle,
    accessibilityLabel,
}: ButtonProps) {
    const renderedIcon = icon === undefined || icon === null
        ? null
        : isIconSpec(icon)
            ? (
                <MaterialCommunityIcons
                    name={icon.name}
                    size={icon.size ?? 20}
                    color={icon.color ?? Theme.colors.textPrimary}
                />
            )
            : icon;

    return (
        <View style={containerStyle}>
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || loading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel ?? title}
                accessibilityState={{ disabled: disabled || loading, busy: loading }}
                style={[
                    styles.button,
                    buttonStyle,
                    // After buttonStyle, so a disabled look can override the colours
                    // the caller set for the resting state.
                    disabled && (disabledStyle ?? styles.disabled),
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={Theme.colors.textPrimary} />
                ) : (
                    <>
                        {renderedIcon}
                        {title ? (
                            <Text
                                // No default for the disabled title: the button is
                                // already dimmed as a whole, and greying the text
                                // on top of that leaves it barely readable.
                                style={[styles.title, titleStyle, disabled && disabledTitleStyle]}
                            >
                                {title}
                            </Text>
                        ) : null}
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
    },
    title: {
        color: Theme.colors.textPrimary,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.5,
    },
});
