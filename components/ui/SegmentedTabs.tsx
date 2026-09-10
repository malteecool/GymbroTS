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
    style?: StyleProp<ViewStyle>;
}

/**
 * Underlined tab bar for switching between two or three peer lists
 * (followers/following, following-feed/explore).
 */
export function SegmentedTabs<T extends string>({ options, value, onChange, style }: SegmentedTabsProps<T>) {
    return (
        <View style={[styles.tabs, style]}>
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <TouchableOpacity
                        key={option.value}
                        style={[styles.tab, active && styles.tabActive]}
                        onPress={() => onChange(option.value)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>
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
        backgroundColor: Theme.colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.colors.divider,
    },
    tab: {
        flex: 1,
        paddingVertical: Theme.spacing.md,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: Theme.colors.accent,
    },
    tabText: {
        color: Theme.colors.textMuted,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
    },
    tabTextActive: {
        color: Theme.colors.textPrimary,
        fontWeight: Theme.fontWeight.semibold,
    },
});
