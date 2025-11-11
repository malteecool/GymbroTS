import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { Theme } from "../../constants/Theme";

interface LoadingIndicatorProps {
    text?: string;
    backgroundColor?: string;
}

export function LoadingIndicator({ text, backgroundColor = Theme.colors.dark }: LoadingIndicatorProps) {
    return (
        <View style={[styles.container, { backgroundColor }]}>
            <View style={styles.indicatorContainer}>
                <ActivityIndicator size="large" color={Theme.colors.font} />
                {text && <Text style={styles.text}>{text}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    indicatorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        marginTop: Theme.spacing.md,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
    },
});