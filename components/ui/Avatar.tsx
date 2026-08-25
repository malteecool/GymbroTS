import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

interface AvatarProps {
    uri?: string | null;
    size: number;
}

export function Avatar({ uri, size }: AvatarProps) {
    const containerStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
    };

    if (uri) {
        return (
            <Image
                source={{ uri }}
                style={[styles.image, containerStyle]}
            />
        );
    }

    return (
        <View style={[styles.placeholder, containerStyle]}>
            <MaterialCommunityIcons name="account" size={size * 0.55} color={Theme.colors.dark} />
        </View>
    );
}

const styles = StyleSheet.create({
    image: {
        backgroundColor: Theme.colors.border,
    },
    placeholder: {
        backgroundColor: Theme.colors.yellow,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
