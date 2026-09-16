import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Theme } from '../../constants/Theme';

export interface SegmentOption<T extends string> {
    value: T;
    label: string;
}

interface SegmentedTabsProps<T extends string> {
    options: SegmentOption<T>[];
    value: T;
    onChange: (value: T) => void;
    /**
     * Splits the control's width evenly between the options instead of sizing
     * each to its label. How much width the control itself gets is the parent's
     * call - inside a row, give it `flex: 1` through `style`.
     */
    stretch?: boolean;
    style?: StyleProp<ViewStyle>;
}

/**
 * Pill switcher for peer lists - the feed's Following/Explore, followers vs
 * following, the comment sort. Sits on the screen background rather than a bar
 * of its own, so a screen has one raised surface at most: the content.
 */
export function SegmentedTabs<T extends string>({ options, value, onChange, stretch, style }: SegmentedTabsProps<T>) {
    return (
        <View style={[styles.tabs, style]}>
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <TouchableOpacity
                        key={option.value}
                        style={[styles.tab, stretch && styles.tabStretch, active && styles.tabActive]}
                        onPress={() => onChange(option.value)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[styles.tabText, active && styles.tabTextActive]}
                            numberOfLines={1}
                        >
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    tabs: {
        flexDirection: 'row',
        gap: Theme.spacing.sm,
    },
    tabStretch: {
        flex: 1,
        alignItems: 'center',
    },
    tab: {
        paddingVertical: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.round,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    tabActive: {
        backgroundColor: Theme.colors.surface,
        borderColor: Theme.colors.yellow,
    },
    tabText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    tabTextActive: {
        color: Theme.colors.font,
    },
});
