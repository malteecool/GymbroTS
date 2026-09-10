import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { ImageSource } from '../../services/ImageUploadService.Service';

interface ImagePickerSheetProps {
    visible: boolean;
    onSelect: (source: ImageSource) => void;
    onCancel: () => void;
}

// Deliberately not using React Native's <Modal> here: on Android, a standalone Modal
// (one that isn't opened while another Modal is already on screen) can fail to size
// its native window and render collapsed in the top-left corner. This sheet is always
// hosted at the app root (see ImagePickerHostProvider), so a plain full-screen overlay
// achieves the same "on top of everything" effect without going through that native
// Modal window at all.
export function ImagePickerSheet({ visible, onSelect, onCancel }: ImagePickerSheetProps) {
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
                <View style={styles.sheet}>
                    <TouchableOpacity style={styles.option} onPress={() => onSelect('camera')} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="camera" size={22} color={Theme.colors.font} />
                        <Text style={styles.optionText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.option} onPress={() => onSelect('library')} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="image-multiple" size={22} color={Theme.colors.font} />
                        <Text style={styles.optionText}>Choose from Library</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
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
