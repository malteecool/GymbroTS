import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

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
}

// Deliberately not React Native's <Modal>: on Android a standalone Modal can
// fail to size its native window and render collapsed in the corner. A plain
// absolute overlay gets the same result without the native window - the same
// reasoning as ImagePickerSheet, which this generalises.
export function ActionSheet({ visible, title, options, onCancel, cancelLabel = 'Cancel' }: ActionSheetProps) {
    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            onCancel();
            return true;
        });
        return () => sub.remove();
    }, [visible, onCancel]);

    if (!visible) return null;

    return (
        <View style={styles.root} pointerEvents="box-none">
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
                {/* Swallows taps on the sheet itself so they do not close it. */}
                <TouchableOpacity style={styles.sheet} activeOpacity={1}>
                    {title ? <Text style={styles.title}>{title}</Text> : null}

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

                    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                        <Text style={styles.cancelText}>{cancelLabel}</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
        elevation: 1000,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Theme.colors.surface,
        borderTopLeftRadius: Theme.borderRadius.xl,
        borderTopRightRadius: Theme.borderRadius.xl,
        padding: Theme.spacing.lg,
        paddingBottom: Theme.spacing.xl,
        gap: Theme.spacing.sm,
    },
    title: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
        textAlign: 'center',
        marginBottom: Theme.spacing.xs,
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
