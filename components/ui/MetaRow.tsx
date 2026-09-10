import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface MetaItem {
    icon: IconName;
    label: string;
}

interface MetaRowProps {
    items: MetaItem[];
    /** Centres the facts instead of left-aligning them (hero cards). */
    align?: 'left' | 'center';
    style?: StyleProp<ViewStyle>;
}

/**
 * The icon + value facts shown under a card title (weight, last done, count).
 */
export function MetaRow({ items, align = 'left', style }: MetaRowProps) {
    if (items.length === 0) return null;

    return (
        <View style={[styles.row, align === 'center' && styles.rowCentered, style]}>
            {items.map((item) => (
                <View key={`${item.icon}-${item.label}`} style={styles.item}>
                    <MaterialCommunityIcons
                        name={item.icon}
                        size={14}
                        color={Theme.colors.textMuted}
                    />
                    <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: Theme.spacing.md,
        marginTop: Theme.spacing.xs,
    },
    rowCentered: {
        justifyContent: 'center',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    label: {
        ...Theme.typography.meta,
        fontSize: Theme.fontSize.xs,
    },
});
