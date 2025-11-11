import { Stack, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import 'react-native-reanimated';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HeaderBackButton } from "@react-navigation/elements";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useFonts } from '../hooks/useFonts';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { Theme, Styles } from '../constants/Theme';

import 'expo-router/entry';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
    const router = useRouter();
    const { auth, userInfo, isLoading, signIn } = useAuth();
    const { fontsLoading } = useFonts();

    const isAuthenticated = auth && userInfo;
    const showLoading = isLoading || fontsLoading;

    if (showLoading || !isAuthenticated) {
        return (
            <View style={styles.container}>
                <StatusBar
                    backgroundColor="transparent"
                    barStyle="light-content"
                    translucent={true}
                />
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons 
                        size={200} 
                        name='dumbbell' 
                        color={Theme.colors.font} 
                    />
                </View>
                {showLoading ? (
                    <View style={styles.loadingContainer}>
                        <LoadingIndicator 
                            text='Logging in...' 
                            backgroundColor={Theme.colors.dark} 
                        />
                    </View>
                ) : (
                    <View style={styles.signInContainer}>
                        <Text style={styles.signInText}>
                            Please sign in to store your workouts
                        </Text>
                        <TouchableOpacity 
                            style={styles.signInButton}
                            onPress={signIn}
                        >
                            <MaterialCommunityIcons 
                                name="google" 
                                size={24} 
                                color={Theme.colors.font} 
                                style={styles.signInIcon}
                            />
                            <Text style={styles.signInButtonText}>
                                Sign in with Google
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={styles.appContainer}>
            <StatusBar
                backgroundColor="transparent"
                barStyle="light-content"
                translucent={true}
            />
            <Stack
                screenOptions={{
                    header: ({ options }) => (
                        <View style={Styles.headerContainer}>
                            <HeaderBackButton
                                tintColor={Theme.colors.font}
                                style={Styles.backButton}
                                onPress={() => router.back()}
                            />
                            <Text style={Styles.headerTitle}>
                                {options.title}
                            </Text>
                        </View>
                    ),
                }}
            >
                <Stack.Screen 
                    name="(tabs)" 
                    options={{ headerShown: false }} 
                />
                <Stack.Screen 
                    name="exercise/exerciseDetails" 
                    options={{ headerShown: true }} 
                />
                <Stack.Screen 
                    name="exercise/addExercise" 
                    options={{ headerShown: true }} 
                />
                <Stack.Screen 
                    name="exercise/addSet" 
                    options={{ headerShown: true }} 
                />
                <Stack.Screen 
                    name="workout/workoutDetails" 
                    options={{ headerShown: true }} 
                />
                <Stack.Screen 
                    name="workout/addWorkout" 
                    options={{ headerShown: true }} 
                />
                <Stack.Screen 
                    name="+not-found" 
                />
            </Stack>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
    },
    appContainer: {
        flex: 1,
        paddingTop: StatusBar.currentHeight || 0,
        backgroundColor: Theme.colors.lessDark,
    },
    iconContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
    },
    signInContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
        paddingHorizontal: Theme.spacing.lg,
    },
    signInText: {
        padding: Theme.spacing.sm,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        marginBottom: Theme.spacing.lg,
        textAlign: 'center',
    },
    signInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        paddingHorizontal: Theme.spacing.lg,
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        ...Theme.shadows.medium,
    },
    signInIcon: {
        marginRight: Theme.spacing.sm,
    },
    signInButtonText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
});