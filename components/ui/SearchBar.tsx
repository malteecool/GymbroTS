import React from 'react';
import { StyleProp, StyleSheet, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    style?: StyleProp<ViewStyle>;
}

/**
 * Single search affordance shared by every filterable list, so the field
 * looks and behaves the same wherever it shows up.
 */
export function SearchBar({ value, onChangeText, placeholder = 'Search...', autoFocus, style }: SearchBarProps) {
    return (
        <View style={[styles.container, style]}>
            <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={Theme.colors.textMuted}
                style={styles.icon}
            />
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={Theme.colors.textMuted}
                autoCapitalize="none"
                autoFocus={autoFocus}
                returnKeyType="search"
            />
            {value.length > 0 && (
                <TouchableOpacity
                    onPress={() => onChangeText('')}
                    style={styles.clearButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons
                        name="close-circle"
                        size={20}
                        color={Theme.colors.textMuted}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        marginHorizontal: Theme.spacing.sm,
        marginTop: Theme.spacing.sm,
        marginBottom: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
    },
    icon: {
        marginRight: Theme.spacing.sm,
    },
    input: {
        flex: 1,
        height: 40,
        color: Theme.colors.textPrimary,
        fontSize: Theme.fontSize.md,
        paddingVertical: 0,
    },
    clearButton: {
        marginLeft: Theme.spacing.sm,
    },
});
