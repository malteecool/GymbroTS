import { Stack, ThemeProvider, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as SystemUI from 'expo-system-ui';
import React from 'react';
import 'react-native-reanimated';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { HeaderBackButton } from "expo-router/react-navigation";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthProvider, useAuthContext } from '../providers/AuthProvider';
import { NotificationProvider } from '../providers/NotificationProvider';
import { ImagePickerHostProvider } from '../providers/ImagePickerHostProvider';
import { useFonts } from '../hooks/useFonts';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import LoginScreen from './(auth)/LoginScreen';
import { Theme, Styles, NavigationTheme } from '../constants/Theme';

import 'expo-router/entry';


WebBrowser.maybeCompleteAuthSession();

// Paints the window background sitting behind the React view tree, so anything
// the app's own views do not cover - the edge-to-edge strips behind the
// transparent system bars, and the gap before the first screen mounts - reads as
// the app background instead of the platform default.
SystemUI.setBackgroundColorAsync(Theme.colors.background);

/**
 * Root layout content - uses auth context
 * This component is wrapped by AuthProvider below
 */
function RootLayoutContent() {
    const router = useRouter();
    const { user, userInfo, isLoading } = useAuthContext();
    const { fontsLoading } = useFonts();

    const isAuthenticated = !!user && !!userInfo;
    const showLoading = isLoading || fontsLoading;

    // Show login screen if not authenticated
    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    // Loading state for authenticated session setup
    if (showLoading) {
        return (
            <View style={styles.container}>
                <StatusBar
                    backgroundColor="transparent"
                    barStyle="light-content"
                    translucent={true}
                />
                <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons 
                        size={100} 
                        name='dumbbell' 
                        color={Theme.colors.accent} 
                    />
                    <LoadingIndicator 
                        text='Loading...' 
                        backgroundColor={Theme.colors.dark} 
                    />
                </View>
            </View>
        );
    }

    // Main app layout for authenticated users
    return (
        <ImagePickerHostProvider>
            <NotificationProvider>
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
                                    {options.headerRight && (
                                        <View style={styles.headerRight}>
                                            {options.headerRight({ canGoBack: true })}
                                        </View>
                                    )}
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
                            name="workout/workoutComplete"
                            options={{ headerShown: false, gestureEnabled: false }}
                        />
                        <Stack.Screen
                            name="workout/addWorkout"
                            options={{ headerShown: true }}
                        />
                        <Stack.Screen
                            name="workout/allWorkouts"
                            options={{ headerShown: true, title: 'My Workouts' }}
                        />
                        <Stack.Screen
                            name="split/createSplit"
                            options={{ headerShown: true }}
                        />
                        <Stack.Screen
                            name="profile/[userId]"
                            options={{ headerShown: true, title: 'Profile' }}
                        />
                        <Stack.Screen
                            name="profile/settings"
                            options={{ headerShown: true, title: 'Settings' }}
                        />
                        <Stack.Screen
                            name="social/discover"
                            options={{ headerShown: true, title: 'Find People' }}
                        />
                        <Stack.Screen
                            name="social/followers"
                            options={{ headerShown: true, title: 'Followers' }}
                        />
                        <Stack.Screen
                            name="social/post/[postId]"
                            // Renders its own header: left-aligned title on the
                            // screen background, plus an options button whose
                            // sheet needs the screen's own state.
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="social/notifications"
                            options={{ headerShown: true, title: 'Notifications' }}
                        />
                        <Stack.Screen
                            name="social/userWorkouts"
                            options={{ headerShown: true, title: 'Workouts' }}
                        />
                        <Stack.Screen
                            name="social/blocked"
                            options={{ headerShown: true, title: 'Blocked Accounts' }}
                        />
                        <Stack.Screen
                            name="+not-found"
                        />
                    </Stack>
                </View>
            </NotificationProvider>
        </ImagePickerHostProvider>
    );
}

/**
 * Root Layout - Wraps everything with AuthProvider, under the dark
 * React Navigation palette so navigator-drawn surfaces match the app.
 */
export default function RootLayout() {
    return (
        <ThemeProvider value={NavigationTheme}>
            <AuthProvider>
                <RootLayoutContent />
            </AuthProvider>
        </ThemeProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.background,
    },
    headerRight: {
        position: 'absolute',
        right: Theme.spacing.sm,
    },
    appContainer: {
        flex: 1,
        paddingTop: StatusBar.currentHeight || 0,
        // Tabs have no header bar, so the status bar strip sits straight on the
        // screen background rather than on a header-coloured band.
        backgroundColor: Theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.background,
    },
});