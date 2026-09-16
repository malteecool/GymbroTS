import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface SelectRowProps {
    label: string;
    icon: IconName;
    onPress?: () => void;
    /** Draws the row in its picked state and shows a check mark. */
    selected?: boolean;
    /** Trailing icon used when the row is not selectable (e.g. 'chevron-right'). */
    trailingIcon?: IconName;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
}

/**
 * A tappable option in a picker list - "add this exercise", "use this workout".
 */
export function SelectRow({ label, icon, onPress, selected, trailingIcon, disabled, style }: SelectRowProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
            style={[styles.row, selected && styles.rowSelected, disabled && styles.rowDisabled, style]}
        >
            <MaterialCommunityIcons
                name={icon}
                size={22}
                color={selected ? Theme.colors.green : Theme.colors.textSecondary}
            />
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={2}>
                {label}
            </Text>
            {selected ? (
                <MaterialCommunityIcons name="check-circle" size={22} color={Theme.colors.green} />
            ) : trailingIcon ? (
                <MaterialCommunityIcons name={trailingIcon} size={20} color={Theme.colors.textMuted} />
            ) : null}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: 'transparent',
        marginHorizontal: Theme.spacing.sm,
        marginVertical: 3,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.md,
    },
    rowSelected: {
        backgroundColor: Theme.colors.successSoft,
        borderColor: Theme.colors.green,
    },
    rowDisabled: {
        opacity: 0.5,
    },
    label: {
        ...Theme.typography.body,
        flex: 1,
    },
    labelSelected: {
        fontWeight: Theme.fontWeight.semibold,
    },
});
