import React from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface FilterChipOption<T extends string> {
    value: T;
    label: string;
    icon?: IconName;
}

interface FilterChipsProps<T extends string> {
    options: FilterChipOption<T>[];
    value: T;
    onChange: (value: T) => void;
    style?: StyleProp<ViewStyle>;
}

/**
 * A scrolling row of single-select filter chips, used under a search field when
 * there are more categories than a SegmentedTabs pill row can hold.
 */
export function FilterChips<T extends string>({ options, value, onChange, style }: FilterChipsProps<T>) {
    return (
        <View style={[styles.wrapper, style]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
                style={styles.scroll}
            >
                {options.map((option) => {
                    const active = option.value === value;
                    return (
                        <TouchableOpacity
                            key={option.value}
                            onPress={() => onChange(option.value)}
                            activeOpacity={0.7}
                            style={[styles.chip, active && styles.chipActive]}
                        >
                            {option.icon && (
                                <MaterialCommunityIcons
                                    name={option.icon}
                                    size={14}
                                    color={active ? Theme.colors.green : Theme.colors.textMuted}
                                />
                            )}
                            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    /**
     * The row's vertical padding lives here rather than on the ScrollView's
     * content: a horizontal ScrollView sizes its frame to the content height
     * without counting contentContainer padding, which clips the chips.
     */
    wrapper: {
        flexGrow: 0,
        flexShrink: 0,
        paddingVertical: Theme.spacing.sm,
    },
    scroll: {
        flexGrow: 0,
        flexShrink: 0,
    },
    content: {
        gap: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
        alignItems: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        gap: Theme.spacing.xs,
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.round,
        borderWidth: 1,
        borderColor: 'transparent',
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
    },
    chipActive: {
        backgroundColor: Theme.colors.successSoft,
        borderColor: Theme.colors.green,
    },
    label: {
        ...Theme.typography.meta,
        fontSize: Theme.fontSize.sm,
        lineHeight: Theme.fontSize.sm + 6,
        color: Theme.colors.textSecondary,
    },
    labelActive: {
        color: Theme.colors.textPrimary,
        fontWeight: Theme.fontWeight.semibold,
    },
});
