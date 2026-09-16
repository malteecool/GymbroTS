import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { BottomSheet } from './BottomSheet';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface ActionSheetOption {
    label: string;
    icon?: IconName;
    /** Renders in the danger colour - blocking, reporting, deleting. */
    destructive?: boolean;
    onPress: () => void;
}

interface ActionSheetProps {
    visible: boolean;
    title?: string;
    options: ActionSheetOption[];
    onCancel: () => void;
    cancelLabel?: string;
    /** Fires once the sheet has finished sliding away - see BottomSheet. */
    onClosed?: () => void;
}

export function ActionSheet({
    visible, title, options, onCancel, cancelLabel = 'Cancel', onClosed,
}: ActionSheetProps) {
    return (
        <BottomSheet visible={visible} onRequestClose={onCancel} onClosed={onClosed}>
            {title ? <Text style={styles.title}>{title}</Text> : null}

            {/*
              * Scrolls once the list outgrows the sheet's height cap - long
              * pickers (every muscle group) would otherwise run off the screen.
              * The title and cancel button stay put outside it.
              */}
            <ScrollView
                style={styles.optionList}
                contentContainerStyle={styles.optionListContent}
                showsVerticalScrollIndicator={true}
                bounces={false}
            >
                {options.map(option => (
                    <TouchableOpacity
                        key={option.label}
                        style={styles.option}
                        onPress={option.onPress}
                        activeOpacity={0.7}
                    >
                        {option.icon && (
                            <MaterialCommunityIcons
                                name={option.icon}
                                size={22}
                                color={option.destructive ? Theme.colors.danger : Theme.colors.font}
                            />
                        )}
                        <Text style={[styles.optionText, option.destructive && styles.optionTextDestructive]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    title: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
        textAlign: 'center',
        marginBottom: Theme.spacing.xs,
    },
    optionList: {
        flexGrow: 0,
        flexShrink: 1,
    },
    optionListContent: {
        gap: Theme.spacing.sm,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.background,
    },
    optionText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
    },
    optionTextDestructive: {
        color: Theme.colors.danger,
    },
    cancelBtn: {
        marginTop: Theme.spacing.sm,
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    cancelText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
    },
});
