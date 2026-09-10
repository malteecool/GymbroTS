import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Styles, Theme } from '../../constants/Theme';
import { MetaItem, MetaRow } from './MetaRow';

interface ListCardProps {
    title: string;
    /** Icon + value facts rendered under the title. */
    meta?: MetaItem[];
    onPress?: () => void;
    /** Shows a trailing delete affordance when provided. */
    onDelete?: () => void;
    /** Replaces the trailing slot entirely (chevron, checkbox, actions...). */
    trailing?: React.ReactNode;
    /** Extra content rendered below the header, inside the same card. */
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

/**
 * The standard row card used by the exercise, workout and split lists:
 * a title, a set of supporting facts and an optional trailing action.
 */
export function ListCard({ title, meta, onPress, onDelete, trailing, children, style }: ListCardProps) {
    const content = (
        <>
            <View style={styles.headerRow}>
                <View style={styles.info}>
                    <Text style={Styles.cardTitle} numberOfLines={2}>{title}</Text>
                    {meta ? <MetaRow items={meta} /> : null}
                </View>
                {trailing}
                {!trailing && onDelete && (
                    <TouchableOpacity
                        onPress={onDelete}
                        style={styles.deleteButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={20}
                            color={Theme.colors.textMuted}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {children}
        </>
    );

    return onPress ? (
        <TouchableOpacity style={[Styles.card, style]} onPress={onPress} activeOpacity={0.7}>
            {content}
        </TouchableOpacity>
    ) : (
        <View style={[Styles.card, style]}>{content}</View>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Theme.spacing.sm,
    },
    info: {
        flex: 1,
    },
    deleteButton: {
        padding: Theme.spacing.xs,
    },
});
