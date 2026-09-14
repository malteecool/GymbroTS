import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { ImageSource } from '../../services/ImageUploadService.Service';
import { BottomSheet } from './BottomSheet';

interface ImagePickerSheetProps {
    visible: boolean;
    onSelect: (source: ImageSource) => void;
    onCancel: () => void;
}

// Hosted at the app root (see ImagePickerHostProvider) so it sits above every
// screen, including the sheets that open it.
export function ImagePickerSheet({ visible, onSelect, onCancel }: ImagePickerSheetProps) {
    return (
        <BottomSheet visible={visible} onRequestClose={onCancel}>
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
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
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
