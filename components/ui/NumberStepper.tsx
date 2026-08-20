import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

interface NumberStepperProps {
    value: number;
    onChange: (value: number) => void;
    step: number;
    minValue?: number;
}

function roundToStep(value: number): number {
    return Math.round(value * 10) / 10;
}

export function NumberStepper({ value, onChange, step, minValue = 0 }: NumberStepperProps) {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={() => onChange(Math.max(minValue, roundToStep(value - step)))}
                style={styles.button}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <MaterialCommunityIcons name="minus" size={16} color={Theme.colors.font} />
            </TouchableOpacity>
            <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={value > 0 ? String(value) : ''}
                placeholder="0"
                placeholderTextColor={Theme.colors.font + '60'}
                onChangeText={(text) => onChange(Math.max(minValue, parseFloat(text) || 0))}
            />
            <TouchableOpacity
                onPress={() => onChange(roundToStep(value + step))}
                style={styles.button}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <MaterialCommunityIcons name="plus" size={16} color={Theme.colors.font} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: Theme.colors.dark,
        borderRadius: Theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    button: {
        width: 28,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
        textAlign: 'center',
        paddingVertical: 0,
    },
});
