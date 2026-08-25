import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

interface StarRatingProps {
    rating: number;
    size?: number;
    color?: string;
    onChange?: (rating: number) => void;
}

/**
 * Read-only by default (e.g. showing an average rating); pass onChange to make
 * it a tappable 0-5 star input instead.
 */
export function StarRating({ rating, size = 18, color, onChange }: StarRatingProps) {
    const starColor = color ?? Theme.colors.accent;
    const interactive = !!onChange;

    return (
        <View style={styles.row}>
            {[1, 2, 3, 4, 5].map((value) => {
                const filled = rating >= value;
                const half = !filled && rating >= value - 0.5;
                const iconName = filled ? 'star' : half ? 'star-half-full' : 'star-outline';

                if (!interactive) {
                    return (
                        <MaterialCommunityIcons key={value} name={iconName} size={size} color={starColor} />
                    );
                }

                return (
                    <TouchableOpacity
                        key={value}
                        onPress={() => onChange!(value)}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                        <MaterialCommunityIcons name={iconName} size={size} color={starColor} />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 2,
    },
});
