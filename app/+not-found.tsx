import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Theme } from '../constants/Theme';

/**
 * Shown when a route does not resolve - most often a deep link into a post or
 * profile that has since been deleted, or a link from an older version of the
 * app whose routes have moved.
 */
export default function NotFoundScreen() {
    const router = useRouter();

    const goHome = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Not found' }} />
            <EmptyState
                icon="map-marker-question-outline"
                title="This page does not exist"
                subtitle="The link may be broken, or whatever it pointed to has been removed."
                action={<Button title="Back to Gymbro" onPress={goHome} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: Theme.colors.background,
    },
});
